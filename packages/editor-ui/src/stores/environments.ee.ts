import { defineStore } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { ref } from 'vue';
import { EnvironmentVariable } from '@/Interface';
import * as environmentsApi from '@/api/environments.ee';
import { useRootStore } from '@/stores/n8nRootStore';
import { createVariable } from '@/api/environments.ee';

export const useEnvironmentsStore = defineStore('enviornments', () => {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();

	const variables = ref<EnvironmentVariable[]>([]);

	async function fetchAllVariables() {
		const data = await environmentsApi.getVariables(rootStore.getRestApiContext);

		variables.value = data;

		return data;
	}

	async function createVariable(variable: Omit<EnvironmentVariable, 'id'>) {
		const data = await environmentsApi.createVariable(rootStore.getRestApiContext, variable);

		variables.value.unshift(data);

		return data;
	}

	async function updateVariable(variable: EnvironmentVariable) {
		const data = await environmentsApi.updateVariable(rootStore.getRestApiContext, variable);

		variables.value = variables.value.map((v) => (v.id === data.id ? data : v));

		return data;
	}

	async function deleteVariable(variable: EnvironmentVariable) {
		const data = await environmentsApi.deleteVariable(rootStore.getRestApiContext, {
			id: variable.id,
		});

		variables.value = variables.value.filter((v) => v.id !== variable.id);

		return data;
	}

	return {
		variables,
		fetchAllVariables,
		createVariable,
		updateVariable,
		deleteVariable,
	};
});
