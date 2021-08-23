/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { IProcessMessage, WorkflowExecute } from 'n8n-core';

import {
	ExecutionError,
	IRun,
	IWorkflowBase,
	LoggerProxy as Logger,
	Workflow,
	WorkflowExecuteMode,
	WorkflowHooks,
	WorkflowOperationError,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-extraneous-dependencies
import * as PCancelable from 'p-cancelable';
import { join as pathJoin } from 'path';
import { fork } from 'child_process';

import * as Bull from 'bull';
import * as config from '../config';
// eslint-disable-next-line import/no-cycle
import {
	ActiveExecutions,
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	IBullJobData,
	IBullJobResponse,
	ICredentialsOverwrite,
	ICredentialsTypeData,
	IExecutionDb,
	IExecutionFlattedDb,
	IExecutionResponse,
	IProcessMessageDataHook,
	ITransferNodeTypes,
	IWorkflowExecutionDataProcess,
	IWorkflowExecutionDataProcessWithExecution,
	NodeTypes,
	Push,
	ResponseHelper,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
} from '.';
import * as Queue from './Queue';

// eslint-disable-next-line import/prefer-default-export
export class WorkflowRunner {
	activeExecutions: ActiveExecutions.ActiveExecutions;

	credentialsOverwrites: ICredentialsOverwrite;

	push: Push.Push;

	jobQueue: Bull.Queue;

	constructor() {
		this.push = Push.getInstance();
		this.activeExecutions = ActiveExecutions.getInstance();
		this.credentialsOverwrites = CredentialsOverwrites().getAll();

		const executionsMode = config.get('executions.mode') as string;

		if (executionsMode === 'queue') {
			this.jobQueue = Queue.getInstance().getBullObjectInstance();
		}
	}

	/**
	 * The process did send a hook message so execute the appropiate hook
	 *
	 * @param {WorkflowHooks} workflowHooks
	 * @param {IProcessMessageDataHook} hookData
	 * @memberof WorkflowRunner
	 */
	// eslint-disable-next-line class-methods-use-this
	processHookMessage(workflowHooks: WorkflowHooks, hookData: IProcessMessageDataHook) {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		workflowHooks.executeHookFunctions(hookData.hook, hookData.parameters);
	}

	/**
	 * The process did error
	 *
	 * @param {ExecutionError} error
	 * @param {Date} startedAt
	 * @param {WorkflowExecuteMode} executionMode
	 * @param {string} executionId
	 * @memberof WorkflowRunner
	 */
	async processError(
		error: ExecutionError,
		startedAt: Date,
		executionMode: WorkflowExecuteMode,
		executionId: string,
		hooks?: WorkflowHooks,
	) {
		const fullRunData: IRun = {
			data: {
				resultData: {
					error: {
						...error,
						message: error.message,
						stack: error.stack,
					},
					runData: {},
				},
			},
			finished: false,
			mode: executionMode,
			startedAt,
			stoppedAt: new Date(),
		};

		// Remove from active execution with empty data. That will
		// set the execution to failed.
		this.activeExecutions.remove(executionId, fullRunData);

		if (hooks) {
			await hooks.executeHookFunctions('workflowExecuteAfter', [fullRunData]);
		}
	}

	/**
	 * Run the workflow
	 *
	 * @param {IWorkflowExecutionDataProcess} data
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 * @returns {Promise<string>}
	 * @memberof WorkflowRunner
	 */
	async run(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
		executionId?: string,
	): Promise<string> {
		const executionsProcess = config.get('executions.process') as string;
		const executionsMode = config.get('executions.mode') as string;

		if (executionsMode === 'queue' && data.executionMode !== 'manual') {
			// Do not run "manual" executions in bull because sending events to the
			// frontend would not be possible
			executionId = await this.runBull(data, loadStaticData, realtime, executionId);
		} else if (executionsProcess === 'main') {
			executionId = await this.runMainProcess(data, loadStaticData, executionId);
		} else {
			executionId = await this.runSubprocess(data, loadStaticData, executionId);
		}

		const externalHooks = ExternalHooks();
		if (externalHooks.exists('workflow.postExecute')) {
			this.activeExecutions
				.getPostExecutePromise(executionId)
				.then(async (executionData) => {
					await externalHooks.run('workflow.postExecute', [executionData, data.workflowData]);
				})
				.catch((error) => {
					console.error('There was a problem running hook "workflow.postExecute"', error);
				});
		}

		return executionId;
	}

	/**
	 * Run the workflow in current process
	 *
	 * @param {IWorkflowExecutionDataProcess} data
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 * @returns {Promise<string>}
	 * @memberof WorkflowRunner
	 */
	async runMainProcess(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		restartExecutionId?: string,
	): Promise<string> {
		if (loadStaticData === true && data.workflowData.id) {
			data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(
				data.workflowData.id as string,
			);
		}

		const nodeTypes = NodeTypes();

		// Soft timeout to stop workflow execution after current running node
		// Changes were made by adding the `workflowTimeout` to the `additionalData`
		// So that the timeout will also work for executions with nested workflows.
		let executionTimeout: NodeJS.Timeout;
		let workflowTimeout = config.get('executions.timeout') as number; // initialize with default
		if (data.workflowData.settings && data.workflowData.settings.executionTimeout) {
			workflowTimeout = data.workflowData.settings.executionTimeout as number; // preference on workflow setting
		}

		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout') as number);
		}

		const workflow = new Workflow({
			id: data.workflowData.id as string | undefined,
			name: data.workflowData.name,
			nodes: data.workflowData.nodes,
			connections: data.workflowData.connections,
			active: data.workflowData.active,
			nodeTypes,
			staticData: data.workflowData.staticData,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			undefined,
			workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
		);

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, undefined, restartExecutionId);
		additionalData.executionId = executionId;

		Logger.verbose(
			`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
			{ executionId },
		);
		let workflowExecution: PCancelable<IRun>;

		try {
			Logger.verbose(
				`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
				{ executionId },
			);
			additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(
				data,
				executionId,
				true,
			);
			additionalData.sendMessageToUI = WorkflowExecuteAdditionalData.sendMessageToUI.bind({
				sessionId: data.sessionId,
			});

			if (data.executionData !== undefined) {
				Logger.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, {
					executionId,
				});
				const workflowExecute = new WorkflowExecute(
					additionalData,
					data.executionMode,
					data.executionData,
				);
				workflowExecution = workflowExecute.processRunExecutionData(workflow);
			} else if (
				data.runData === undefined ||
				data.startNodes === undefined ||
				data.startNodes.length === 0 ||
				data.destinationNode === undefined
			) {
				Logger.debug(`Execution ID ${executionId} will run executing all nodes.`, { executionId });
				// Execute all nodes

				// Can execute without webhook so go on
				const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
				workflowExecution = workflowExecute.run(workflow, undefined, data.destinationNode);
			} else {
				Logger.debug(`Execution ID ${executionId} is a partial execution.`, { executionId });
				// Execute only the nodes between start and destination nodes
				const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
				workflowExecution = workflowExecute.runPartialWorkflow(
					workflow,
					data.runData,
					data.startNodes,
					data.destinationNode,
				);
			}

			this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);

			if (workflowTimeout > 0) {
				const timeout =
					Math.min(workflowTimeout, config.get('executions.maxTimeout') as number) * 1000; // as seconds
				executionTimeout = setTimeout(() => {
					this.activeExecutions.stopExecution(executionId, 'timeout');
				}, timeout);
			}

			workflowExecution
				.then((fullRunData) => {
					clearTimeout(executionTimeout);
					if (workflowExecution.isCanceled) {
						fullRunData.finished = false;
					}
					this.activeExecutions.remove(executionId, fullRunData);
				})
				.catch((error) => {
					this.processError(
						error,
						new Date(),
						data.executionMode,
						executionId,
						additionalData.hooks,
					);
				});
		} catch (error) {
			await this.processError(
				error,
				new Date(),
				data.executionMode,
				executionId,
				additionalData.hooks,
			);

			throw error;
		}

		return executionId;
	}

	async runBull(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
		restartExecutionId?: string,
	): Promise<string> {
		// TODO: If "loadStaticData" is set to true it has to load data new on worker

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, undefined, restartExecutionId);

		const jobData: IBullJobData = {
			executionId,
			loadStaticData: !!loadStaticData,
		};

		let priority = 100;
		if (realtime === true) {
			// Jobs which require a direct response get a higher priority
			priority = 50;
		}
		// TODO: For realtime jobs should probably also not do retry or not retry if they are older than x seconds.
		//       Check if they get retried by default and how often.
		const jobOptions = {
			priority,
			removeOnComplete: true,
			removeOnFail: true,
		};
		let job: Bull.Job;
		let hooks: WorkflowHooks;
		try {
			job = await this.jobQueue.add(jobData, jobOptions);

			console.log(`Started with ID: ${job.id.toString()}`);

			hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerMain(
				data.executionMode,
				executionId,
				data.workflowData,
				{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
			);

			// Normally also workflow should be supplied here but as it only used for sending
			// data to editor-UI is not needed.
			hooks.executeHookFunctions('workflowExecuteBefore', []);
		} catch (error) {
			// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
			// "workflowExecuteAfter" which we require.
			const hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
				data.executionMode,
				executionId,
				data.workflowData,
				{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
			);
			await this.processError(error, new Date(), data.executionMode, executionId, hooks);
			throw error;
		}

		const workflowExecution: PCancelable<IRun> = new PCancelable(
			async (resolve, reject, onCancel) => {
				onCancel.shouldReject = false;
				onCancel(async () => {
					await Queue.getInstance().stopJob(job);

					// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooksWorker = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
						data.executionMode,
						executionId,
						data.workflowData,
						{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
					);

					const error = new WorkflowOperationError('Workflow-Execution has been canceled!');
					await this.processError(error, new Date(), data.executionMode, executionId, hooksWorker);

					reject(error);
				});

				const jobData: Promise<IBullJobResponse> = job.finished();

				const queueRecoveryInterval = config.get('queue.bull.queueRecoveryInterval') as number;

				const racingPromises: Array<Promise<IBullJobResponse | object>> = [jobData];

				let clearWatchdogInterval;
				if (queueRecoveryInterval > 0) {
					/** ***********************************************
					 * Long explanation about what this solves:      *
					 * This only happens in a very specific scenario *
					 * when Redis crashes and recovers shortly       *
					 * but during this time, some execution(s)       *
					 * finished. The end result is that the main     *
					 * process will wait indefinitively and never    *
					 * get a response. This adds an active polling to*
					 * the queue that allows us to identify that the *
					 * execution finished and get information from   *
					 * the database.                                 *
					 ************************************************ */
					let watchDogInterval: NodeJS.Timeout | undefined;

					const watchDog: Promise<object> = new Promise((res) => {
						watchDogInterval = setInterval(async () => {
							const currentJob = await this.jobQueue.getJob(job.id);
							// When null means job is finished (not found in queue)
							if (currentJob === null) {
								// Mimic worker's success message
								res({ success: true });
							}
						}, queueRecoveryInterval * 1000);
					});

					racingPromises.push(watchDog);

					clearWatchdogInterval = () => {
						if (watchDogInterval) {
							clearInterval(watchDogInterval);
							watchDogInterval = undefined;
						}
					};
				}

				try {
					await Promise.race(racingPromises);
					if (clearWatchdogInterval !== undefined) {
						clearWatchdogInterval();
					}
				} catch (error) {
					// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
						data.executionMode,
						executionId,
						data.workflowData,
						{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
					);
					Logger.error(`Problem with execution ${executionId}: ${error.message}. Aborting.`);
					if (clearWatchdogInterval !== undefined) {
						clearWatchdogInterval();
					}
					await this.processError(error, new Date(), data.executionMode, executionId, hooks);

					reject(error);
				}

				const executionDb = (await Db.collections.Execution!.findOne(
					executionId,
				)) as IExecutionFlattedDb;
				const fullExecutionData = ResponseHelper.unflattenExecutionData(executionDb);
				const runData = {
					data: fullExecutionData.data,
					finished: fullExecutionData.finished,
					mode: fullExecutionData.mode,
					startedAt: fullExecutionData.startedAt,
					stoppedAt: fullExecutionData.stoppedAt,
				} as IRun;

				this.activeExecutions.remove(executionId, runData);
				// Normally also static data should be supplied here but as it only used for sending
				// data to editor-UI is not needed.
				hooks.executeHookFunctions('workflowExecuteAfter', [runData]);
				try {
					// Check if this execution data has to be removed from database
					// based on workflow settings.
					let saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
					let saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
					if (data.workflowData.settings !== undefined) {
						saveDataErrorExecution =
							(data.workflowData.settings.saveDataErrorExecution as string) ||
							saveDataErrorExecution;
						saveDataSuccessExecution =
							(data.workflowData.settings.saveDataSuccessExecution as string) ||
							saveDataSuccessExecution;
					}

					const workflowDidSucceed = !runData.data.resultData.error;
					if (
						(workflowDidSucceed && saveDataSuccessExecution === 'none') ||
						(!workflowDidSucceed && saveDataErrorExecution === 'none')
					) {
						await Db.collections.Execution!.delete(executionId);
					}
					// eslint-disable-next-line id-denylist
				} catch (err) {
					// We don't want errors here to crash n8n. Just log and proceed.
					console.log('Error removing saved execution from database. More details: ', err);
				}

				resolve(runData);
			},
		);

		this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
		return executionId;
	}

	/**
	 * Run the workflow
	 *
	 * @param {IWorkflowExecutionDataProcess} data
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 * @returns {Promise<string>}
	 * @memberof WorkflowRunner
	 */
	async runSubprocess(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		restartExecutionId?: string,
	): Promise<string> {
		let startedAt = new Date();
		const subprocess = fork(pathJoin(__dirname, 'WorkflowRunnerProcess.js'));

		if (loadStaticData === true && data.workflowData.id) {
			data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(
				data.workflowData.id as string,
			);
		}

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, subprocess, restartExecutionId);

		// Supply all nodeTypes and credentialTypes
		const nodeTypeData = WorkflowHelpers.getAllNodeTypeData();
		const credentialTypes = CredentialTypes();

		(data as unknown as IWorkflowExecutionDataProcessWithExecution).executionId = executionId;
		(data as unknown as IWorkflowExecutionDataProcessWithExecution).nodeTypeData = nodeTypeData;
		(data as unknown as IWorkflowExecutionDataProcessWithExecution).credentialsOverwrite =
			this.credentialsOverwrites;
		(data as unknown as IWorkflowExecutionDataProcessWithExecution).credentialsTypeData =
			credentialTypes.credentialTypes;

		const workflowHooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);

		try {
			// Send all data to subprocess it needs to run the workflow
			subprocess.send({ type: 'startWorkflow', data } as IProcessMessage);
		} catch (error) {
			await this.processError(error, new Date(), data.executionMode, executionId, workflowHooks);
			return executionId;
		}

		// Start timeout for the execution
		let executionTimeout: NodeJS.Timeout;
		let workflowTimeout = config.get('executions.timeout') as number; // initialize with default
		if (data.workflowData.settings && data.workflowData.settings.executionTimeout) {
			workflowTimeout = data.workflowData.settings.executionTimeout as number; // preference on workflow setting
		}

		const processTimeoutFunction = (timeout: number) => {
			this.activeExecutions.stopExecution(executionId, 'timeout');
			executionTimeout = setTimeout(() => subprocess.kill(), Math.max(timeout * 0.2, 5000)); // minimum 5 seconds
		};

		if (workflowTimeout > 0) {
			workflowTimeout =
				Math.min(workflowTimeout, config.get('executions.maxTimeout') as number) * 1000; // as seconds
			// Start timeout already now but give process at least 5 seconds to start.
			// Without it could would it be possible that the workflow executions times out before it even got started if
			// the timeout time is very short as the process start time can be quite long.
			executionTimeout = setTimeout(
				processTimeoutFunction,
				Math.max(5000, workflowTimeout),
				workflowTimeout,
			);
		}

		// Create a list of child spawned executions
		// If after the child process exits we have
		// outstanding executions, we remove them
		const childExecutionIds: string[] = [];

		// Listen to data from the subprocess
		subprocess.on('message', async (message: IProcessMessage) => {
			Logger.debug(
				`Received child process message of type ${message.type} for execution ID ${executionId}.`,
				{ executionId },
			);
			if (message.type === 'start') {
				// Now that the execution actually started set the timeout again so that does not time out to early.
				startedAt = new Date();
				if (workflowTimeout > 0) {
					clearTimeout(executionTimeout);
					executionTimeout = setTimeout(processTimeoutFunction, workflowTimeout, workflowTimeout);
				}
			} else if (message.type === 'end') {
				clearTimeout(executionTimeout);
				this.activeExecutions.remove(executionId, message.data.runData);
			} else if (message.type === 'sendMessageToUI') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				WorkflowExecuteAdditionalData.sendMessageToUI.bind({ sessionId: data.sessionId })(
					message.data.source,
					message.data.message,
				);
			} else if (message.type === 'processError') {
				clearTimeout(executionTimeout);
				const executionError = message.data.executionError as ExecutionError;
				await this.processError(
					executionError,
					startedAt,
					data.executionMode,
					executionId,
					workflowHooks,
				);
			} else if (message.type === 'processHook') {
				this.processHookMessage(workflowHooks, message.data as IProcessMessageDataHook);
			} else if (message.type === 'timeout') {
				// Execution timed out and its process has been terminated
				const timeoutError = new WorkflowOperationError('Workflow execution timed out!');

				// No need to add hook here as the subprocess takes care of calling the hooks
				this.processError(timeoutError, startedAt, data.executionMode, executionId);
			} else if (message.type === 'startExecution') {
				const executionId = await this.activeExecutions.add(message.data.runData);
				childExecutionIds.push(executionId);
				subprocess.send({ type: 'executionId', data: { executionId } } as IProcessMessage);
			} else if (message.type === 'finishExecution') {
				const executionIdIndex = childExecutionIds.indexOf(message.data.executionId);
				if (executionIdIndex !== -1) {
					childExecutionIds.splice(executionIdIndex, 1);
				}

				// eslint-disable-next-line @typescript-eslint/await-thenable
				await this.activeExecutions.remove(message.data.executionId, message.data.result);
			}
		});

		// Also get informed when the processes does exit especially when it did crash or timed out
		subprocess.on('exit', async (code, signal) => {
			if (signal === 'SIGTERM') {
				Logger.debug(`Subprocess for execution ID ${executionId} timed out.`, { executionId });
				// Execution timed out and its process has been terminated
				const timeoutError = new WorkflowOperationError('Workflow execution timed out!');

				await this.processError(
					timeoutError,
					startedAt,
					data.executionMode,
					executionId,
					workflowHooks,
				);
			} else if (code !== 0) {
				Logger.debug(
					`Subprocess for execution ID ${executionId} finished with error code ${code}.`,
					{ executionId },
				);
				// Process did exit with error code, so something went wrong.
				const executionError = new WorkflowOperationError(
					'Workflow execution process did crash for an unknown reason!',
				);

				await this.processError(
					executionError,
					startedAt,
					data.executionMode,
					executionId,
					workflowHooks,
				);
			}

			for (const executionId of childExecutionIds) {
				// When the child process exits, if we still have
				// pending child executions, we mark them as finished
				// They will display as unknown to the user
				// Instead of pending forever as executing when it
				// actually isn't anymore.
				// eslint-disable-next-line @typescript-eslint/await-thenable, no-await-in-loop
				await this.activeExecutions.remove(executionId);
			}

			clearTimeout(executionTimeout);
		});

		return executionId;
	}
}
