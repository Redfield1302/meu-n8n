import { BasePage } from './base';

export class CredentialsPage extends BasePage {
	url = '/home/credentials';

	getters = {
		emptyListCreateCredentialButton: () => cy.getByTestId('empty-resources-list').find('button'),
		createCredentialButton: () => {
			cy.getByTestId('resource-add').should('be.visible').click();
			cy.getByTestId('resource-add')
				.find('.el-sub-menu__title')
				.as('menuitem')
				.should('have.attr', 'aria-describedby');

			cy.get('@menuitem')
				.should('be.visible')
				.invoke('attr', 'aria-describedby')
				.then((el) => cy.get(`[id="${el}"]`))
				.as('submenu');

			cy.get('@submenu')
				.should('be.visible')
				.within((submenu) => {

					// If submenu has another submenu
					if (submenu.find('[data-test-id="navigation-submenu"]').length) {
						cy.wrap(submenu)
							.find('[data-test-id="navigation-submenu"]')
							.should('be.visible')
							.filter(':contains("Credential")')
							.as('child')
							.click();

						cy.get('@child')
							.should('be.visible')
							.find('[data-test-id="navigation-submenu-item"]')
							.should('be.visible')
							.filter(':contains("Personal")')
							.as('button');
					} else {
						cy.wrap(submenu).find('[data-test-id="navigation-menu-item"]').filter(':contains("Credential")').as('button');
					}
				});

			return cy.get('@button').should('be.visible');
		},

		// cy.getByTestId('resources-list-add'),
		searchInput: () => cy.getByTestId('resources-list-search'),
		emptyList: () => cy.getByTestId('resources-list-empty'),
		credentialCards: () => cy.getByTestId('resources-list-item'),
		credentialCard: (credentialName: string) =>
			this.getters
				.credentialCards()
				.contains(credentialName)
				.parents('[data-test-id="resources-list-item"]'),
		credentialCardActions: (credentialName: string) =>
			this.getters.credentialCard(credentialName).findChildByTestId('credential-card-actions'),
		credentialDeleteButton: () =>
			cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Delete'),
		credentialMoveButton: () =>
			cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Move'),
		sort: () => cy.getByTestId('resources-list-sort').first(),
		sortOption: (label: string) =>
			cy.getByTestId('resources-list-sort-item').contains(label).first(),
		filtersTrigger: () => cy.getByTestId('resources-list-filters-trigger'),
		filtersDropdown: () => cy.getByTestId('resources-list-filters-dropdown'),
	};

	actions = {
		search: (searchString: string) => {
			const searchInput = this.getters.searchInput();
			searchInput.clear();

			if (searchString) {
				searchInput.type(searchString);
			}
		},
		sortBy: (type: 'nameAsc' | 'nameDesc' | 'lastUpdated' | 'lastCreated') => {
			const sortTypes = {
				nameAsc: 'Sort by name (A-Z)',
				nameDesc: 'Sort by name (Z-A)',
				lastUpdated: 'Sort by last updated',
				lastCreated: 'Sort by last created',
			};

			this.getters.sort().click();
			this.getters.sortOption(sortTypes[type]).click();
		},
	};
}
