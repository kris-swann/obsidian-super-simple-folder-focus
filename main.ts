import { MenuItem, Plugin, setIcon, TFolder } from "obsidian";

export default class SuperSimpleFolderFocus extends Plugin {
	/**
	 * In-memory variable. When defined, the file explorer uses this path as the top-level dir
	 */
	focusPath: string | undefined;

	async onload() {
		this.focusPath = undefined; // No focus by default

		// Add option in right-click menu of file explorer
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem((item: MenuItem) => {
						item.setTitle("Focus on this folder")
							.setIcon("eye")
							.onClick(async () => {
								await this.focusOnFolder(file);
							});
					});
				}
			}),
		);

		// Command to reset focus from command palette
		this.addCommand({
			id: "super-simple-folder-focus-command-unfocus",
			name: "Unfocus",
			callback: () => {
				this.unfocus();
			},
		});
	}

	async onunload() {
		await this.unfocus();
	}

	/**
	 * Sets the focus folder in the file explorer
	 */
	async focusOnFolder(folder: TFolder) {
		this.focusPath = folder.path;

		if (!this.focusPath) {
			return;
		}

		// We need to handle parents to hide them, but still allow their children to be visible
		// const focusPathParents = this.focusPath
		// 	.split("/")
		// 	.slice(0, -1) // Ignore the last dir
		// 	.reduce((acc, val, i) => {
		// 		if (i === 0) {
		// 			return [val];
		// 		} else {
		// 			acc.push(acc[i - 1] + "/" + val);
		// 			return acc;
		// 		}
		// 	}, [] as string[]);
		const focusPathParents = this.focusPath
			.split("/")
			.slice(0, -1)  // Ignore the last dir
			.map((_, i, parts) => parts.slice(0, i + 1).join("/"));

		const fileExplorers = this.app.workspace.getLeavesOfType("file-explorer");
		fileExplorers.forEach(async (fileExplorerLeaf) => {

			// Add unfocus header button
			const navHeader = fileExplorerLeaf.view.containerEl.querySelector("div.nav-header");
			const existingHeader = navHeader?.querySelector(".super-simple-folder-focus-header");
			if (existingHeader) {
				existingHeader?.remove();
			}
			const focusHeader = document.createElement("div");
			focusHeader.classList.add("super-simple-folder-focus-header");
			const focusHeaderIcon = document.createElement("span");
			focusHeaderIcon.classList.add("super-simple-folder-focus-header-icon");
			setIcon(focusHeaderIcon, "eye");
			focusHeader.appendChild(focusHeaderIcon);
			const focusHeaderText = document.createElement("span");
			focusHeaderText.textContent = folder.name;
			focusHeader.appendChild(focusHeaderText);
			navHeader?.appendChild(focusHeader);
			this.registerDomEvent(focusHeader, "click", () => {
				this.unfocus();
			});

			// Add/remove classes to file items
			const fileItems = (fileExplorerLeaf.view as any).fileItems as Record<string, any>;
			Object.values(fileItems).forEach((fileItem: any) => {
				if (fileItem.file.path === this.focusPath) {
					if (fileItem.collapsed) {
						fileItem.selfEl.click(); // Expand via click if it's collapsed
					}
					// Same classes as parent (we want to hide and show in header instead)
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-focused");
					fileItem.el.classList.add("super-simple-folder-focus-tree-item-parent");
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-hidden");
				} else if (focusPathParents.some((parentPath) => fileItem.file.path === parentPath)) {
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-focused");
					fileItem.el.classList.add("super-simple-folder-focus-tree-item-parent");
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-hidden");
				} else if (fileItem.file.path.includes(this.focusPath)) {
					fileItem.el.classList.add("super-simple-folder-focus-tree-item-focused");
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-parent");
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-hidden");
				} else {
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-focused");
					fileItem.el.classList.remove("super-simple-folder-focus-tree-item-parent");
					fileItem.el.classList.add("super-simple-folder-focus-tree-item-hidden");
				}
			});
		});
	}

	/** Reset folder focus back to root (unfocus) */
	async unfocus() {
		const fileExplorers = this.app.workspace.getLeavesOfType("file-explorer");
		fileExplorers.forEach(async (fileExplorerLeaf) => {
			const focusPath = this.focusPath; // Copy to avoid async issues

			// Remove unfocus header button
			const navHeader = fileExplorerLeaf.view.containerEl.querySelector("div.nav-header");
			const existingHeader = navHeader?.querySelector(".super-simple-folder-focus-header");
			if (existingHeader) {
				existingHeader?.remove();
			}

			// Remove classes from file items
			const fileItems = (fileExplorerLeaf.view as any).fileItems as Record<string, any>;
			Object.values(fileItems).forEach((fileItem: any) => {
				fileItem.el.classList.remove("super-simple-folder-focus-tree-item-focused");
				fileItem.el.classList.remove("super-simple-folder-focus-tree-item-parent");
				fileItem.el.classList.remove("super-simple-folder-focus-tree-item-hidden");
			});
			// Reload the file explorer view (hack to fix rendering issues)
			fileExplorerLeaf.view.load();
		});

		this.focusPath = undefined; // Unset focus path after removing classes
	}
}