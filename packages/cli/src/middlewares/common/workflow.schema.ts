import { Schema } from '@/middlewares/common/schema';
import {
	validateSync,
	IsOptional,
	IsString,
	IsBoolean,
	IsArray,
	IsDateString,
} from 'class-validator';

export class WorkflowSchema extends Schema {
	constructor(data: unknown = {}) {
		super();
		Object.assign(this, data);

		// strip out unknown fields
		const result = validateSync(this, { whitelist: true });

		if (result.length > 0) {
			throw new Error('Parsed filter does not fit the schema');
		}
	}

	@IsOptional()
	@IsString()
	id?: string = undefined;

	@IsOptional()
	@IsString()
	name?: string = undefined;

	@IsOptional()
	@IsBoolean()
	active?: boolean = undefined;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	nodes?: string[] = undefined;

	@IsOptional()
	@IsDateString()
	createdAt?: Date = undefined;

	@IsOptional()
	@IsDateString()
	updatedAt?: Date = undefined;

	static get fieldNames() {
		return Object.getOwnPropertyNames(new WorkflowSchema());
	}
}
