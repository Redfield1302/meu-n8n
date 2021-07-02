import { Notification } from 'element-ui';
import { ElNotificationComponent, ElNotificationOptions } from 'element-ui/types/notification';
import mixins from 'vue-typed-mixins';

import { externalHooks } from '@/components/mixins/externalHooks';

export const showMessage = mixins(externalHooks).extend({
	methods: {
		$showMessage(messageData: ElNotificationOptions) {
			messageData.dangerouslyUseHTMLString = true;
			if (messageData.position === undefined) {
				messageData.position = 'bottom-right';
			}

			return Notification(messageData);
		},

		$showWarning(title: string, message: string,  config?: {onClick?: () => void, duration?: number, customClass?: string, closeOnClick?: boolean}) {
			let notification: ElNotificationComponent;
			if (config && config.closeOnClick) {
				const cb = config.onClick;
				config.onClick = () => {
					if (notification) {
						notification.close();
					}
					if (cb) {
						cb();
					}
				};
			}

			notification = this.$showMessage({
				title,
				message,
				type: 'warning',
				...(config || {}),
			});

			return notification;
		},

		$showError(error: Error, title: string, message?: string) {
			const messageLine = message ? `${message}<br/>` : '';
			this.$showMessage({
				title,
				message: `
					${messageLine}
					<i>${error.message}</i>
					${this.collapsableDetails(error)}`,
				type: 'error',
				duration: 0,
			});

			this.$externalHooks().run('showMessage.showError', {
				title,
				message,
				errorMessage: error.message,
			});
		},

		// @ts-ignore
		collapsableDetails({ description, node }: Error) {
			if (!description) return '';

			const errorDescription =
				description.length > 500
					? `${description.slice(0, 500)}...`
					: description;

			return `
				<br>
				<br>
				<details>
					<summary
						style="color: #ff6d5a; font-weight: bold; cursor: pointer;"
					>
						Show Details
					</summary>
					<p>${node.name}: ${errorDescription}</p>
				</details>
			`;
		},
	},
});
