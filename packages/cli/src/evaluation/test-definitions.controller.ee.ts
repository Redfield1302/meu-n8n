import { Get, Post, Patch, RestController, Delete } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { listQueryMiddleware } from '@/middlewares';
import { getSharedWorkflowIds } from '@/public-api/v1/handlers/workflows/workflows.service';
import { isPositiveInteger } from '@/utils';

import { TestDefinitionsService } from './test-definitions.service.ee';
import { TestDefinitionsRequest } from './test-definitions.types.ee';

@RestController('/evaluation/test-definitions')
export class TestDefinitionsController {
	constructor(private readonly testDefinitionsService: TestDefinitionsService) {}

	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(req: TestDefinitionsRequest.GetMany) {
		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		return await this.testsService.getMany(req.listQueryOptions, workflowIds);
	}

	@Get('/:id')
	async getOne(req: TestDefinitionsRequest.GetOne) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Test ID is not a number');
		}

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		const testDefinition = await this.testsService.findOne(Number(req.params.id), workflowIds);

		if (!testDefinition) throw new NotFoundError('Test definition not found');

		return testDefinition;
	}

	@Post('/')
	async create(req: TestDefinitionsRequest.Create) {
		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		if (!workflowIds.includes(req.body.workflowId)) {
			throw new BadRequestError('User does not have access to the workflow');
		}

		if (req.body.evaluationWorkflowId && !workflowIds.includes(req.body.evaluationWorkflowId)) {
			throw new BadRequestError('User does not have access to the evaluation workflow');
		}

		return await this.testsService.save(this.testsService.toEntity(req.body));
	}

	@Delete('/:id')
	async delete(req: TestDefinitionsRequest.Delete) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Test ID is not a number');
		}

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		if (workflowIds.length === 0) throw new NotFoundError('Test definition not found');

		await this.testsService.delete(Number(req.params.id), workflowIds);

		return { success: true };
	}

	@Patch('/:id')
	async update(req: TestDefinitionsRequest.Update) {
		if (!isPositiveInteger(req.params.id)) {
			throw new BadRequestError('Test ID is not a number');
		}

		const workflowIds = await getSharedWorkflowIds(req.user, ['workflow:read']);

		// Fail fast if no workflows are accessible
		if (workflowIds.length === 0) throw new NotFoundError('Workflow not found');

		const existingTest = await this.testsService.findOne(Number(req.params.id), workflowIds);
		if (!existingTest) throw new NotFoundError('Test definition not found');

		if (req.body.evaluationWorkflowId && !workflowIds.includes(req.body.evaluationWorkflowId)) {
			throw new BadRequestError('User does not have access to the evaluation workflow');
		}

		return await this.testsService.update(Number(req.params.id), req.body, workflowIds);
	}
}
