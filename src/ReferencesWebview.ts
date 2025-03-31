// Import components for side effects (registers custom elements)
import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-checkbox-group';
import '@vscode-elements/elements/dist/vscode-tree';

// Define the structure for VS Code Location data (simplified)
interface VSCodeLocation {
	uri: {
		scheme: string;
		authority: string;
		path: string;
		query: string;
		fragment: string;
	};
	range: [
		{ line: number; character: number }, // Start
		{ line: number; character: number }  // End
	];
}

// Define the structure for Tree data items
interface TreeItemData {
	label: string;
	value: string; // Store file path or unique identifier
	icons?: { branch?: string; leaf?: string; open?: string };
	subItems?: TreeItemData[];
	selected?: boolean;
	open?: boolean;
	// Add classification later if needed directly in tree
}

// TODO: Maybe should use type from library, but getting errors when trying to import
// So just leave it as is for now.
// Define the vscode tree select event structure based on library docs
interface VscTreeSelectEventDetail {
  icons: {
    branch?: string;
    open?: string;
    leaf?: string;
  };
  itemType: 'branch' | 'leaf';
  label: string;
  open: boolean;
  value: string;
  path: string;
}

// --- Helper Functions ---

/**
 * Transforms VSCodeLocation[] into a nested filesystem-like structure required by vscode-tree.
 */
function buildTreeData(refs: VSCodeLocation[]): TreeItemData[] {
	// Step 1: Collect all file paths and organize references by file
	const fileRefMap = new Map<string, VSCodeLocation[]>();
	console.log("Building tree with refs count:", refs.length);

	for (const ref of refs) {
		const filePath = ref.uri.path;
		if (!fileRefMap.has(filePath)) {
			fileRefMap.set(filePath, []);
		}
		fileRefMap.get(filePath)?.push(ref);
	}

	// Step 2: Create directory structure
	const rootNode: { [key: string]: any } = {};

	// Process each file path to build the directory structure
	for (const [filePath, fileRefs] of fileRefMap.entries()) {
		// Skip paths with invalid format
		if (!filePath || filePath === '/') {
			continue;
		}

		// Remove leading slash and split path into components
		const pathParts = filePath.startsWith('/') ? filePath.substring(1).split('/') : filePath.split('/');
		
		// Skip empty paths
		if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === '')) {
			continue;
		}

		// Build the tree structure
		let currentLevel = rootNode;
		
		// Process directories (all parts except the last one which is the file)
		for (let i = 0; i < pathParts.length - 1; i++) {
			const part = pathParts[i];
			if (!part) { continue; } // Skip empty parts
			
			if (!currentLevel[part]) {
				// Create directory path by joining parts up to this level
				const dirPathParts = pathParts.slice(0, i + 1);
				const dirPath = '/' + dirPathParts.join('/');
				
				currentLevel[part] = {
					isDirectory: true,
					children: {},
					path: dirPath,
					fullPath: dirPath // Store actual filesystem path for filtering
				};
			}
			currentLevel = currentLevel[part].children;
		}
		
		// Add the file with its references
		const fileName = pathParts[pathParts.length - 1];
		currentLevel[fileName] = {
			isDirectory: false,
			refs: fileRefs,
			path: filePath,
			fullPath: filePath // Store actual filesystem path for filtering
		};
	}

	// Step 3: Convert the tree structure to the format required by vscode-tree
	function convertToTreeData(node: { [key: string]: any }, nodePath: string = ''): TreeItemData[] {
		const result: TreeItemData[] = [];
		
		// Sort keys - directories first, then files, both alphabetically
		const keys = Object.keys(node).sort((a, b) => {
			const aIsDir = node[a].isDirectory;
			const bIsDir = node[b].isDirectory;
			
			// If both are directories or both are files, sort alphabetically
			if (aIsDir === bIsDir) {
				return a.localeCompare(b);
			}
			
			// Directories come before files
			return aIsDir ? -1 : 1;
		});
		
		for (const key of keys) {
			const item = node[key];
			
			if (item.isDirectory) {
				// Directory node - check if we can compress this path
				let currentItem = item;
				let currentKey = key;
				let pathSegments = [currentKey];
				let fullPath = item.fullPath; // Store the actual filesystem path
				
				// Look for single-child directories that can be merged
				while (currentItem.isDirectory) {
					const childKeys = Object.keys(currentItem.children);
					
					// If we have exactly one child and it's a directory, merge it
					if (childKeys.length === 1) {
						const childKey = childKeys[0];
						const childItem = currentItem.children[childKey];
						
						// Only merge if the child is also a directory
						if (childItem.isDirectory) {
							pathSegments.push(childKey);
							fullPath = childItem.fullPath; // Update to the deepest path
							currentItem = childItem;
							currentKey = childKey;
							continue;
						}
					}
					
					// If we can't merge further, exit the loop
					break;
				}
				
				// Create merged label and get final children
				const mergedLabel = pathSegments.join('/') + '/';
				const finalChildren = currentItem.children;
				
				// Create the merged directory node
				const treeItem: TreeItemData = {
					label: mergedLabel,
					value: fullPath, // Store the actual filesystem path for filtering
					icons: { branch: 'folder', open: 'folder-opened' },
					subItems: convertToTreeData(finalChildren, fullPath)
				};
				result.push(treeItem);
			} else {
				// File node
				const fileRefs = item.refs;
				const filePath = item.fullPath;
				
				// Create reference line items
				const refItems: TreeItemData[] = fileRefs.map((ref: VSCodeLocation) => {
					const lineNum = ref.range[0].line + 1; // 1-based line number
					const charNum = ref.range[0].character + 1;
					return {
						label: `Line ${lineNum}:${charNum}`,
						value: `${filePath}#${lineNum}:${charNum}`, // Unique value for the specific reference
						icons: { leaf: 'symbol-field' } // Icon for reference lines
					};
				}).sort((a: TreeItemData, b: TreeItemData) => {
					// Sort references by line number
					const lineA = parseInt(a.label.match(/Line (\d+):/)?.[1] || '0');
					const lineB = parseInt(b.label.match(/Line (\d+):/)?.[1] || '0');
					return lineA - lineB;
				});
				
				// Create file node with reference subitems
				const fileNode: TreeItemData = {
					label: key,
					value: filePath, // Store full path for filtering
					icons: { branch: 'file-code', leaf: 'file-code' },
					subItems: refItems
				};
				result.push(fileNode);
			}
		}
		
		return result;
	}

	// Convert the root directory into TreeItemData
	return convertToTreeData(rootNode);
}

declare const acquireVsCodeApi: () => any;

// NOTE: For some reason the webview has issues, like window event listener not working if the code is not wrapped in a function like this.
(function () {

	// --- VS Code API Setup ---
	const vscode = acquireVsCodeApi();

	// --- DOM Element References ---
	const filterGroup = document.getElementById('filter-group') as HTMLElement;
	const textFilter = document.getElementById('text-filter') as HTMLInputElement;
	const readFilter = document.getElementById('read-filter') as HTMLInputElement;
	const writeFilter = document.getElementById('write-filter') as HTMLInputElement;
	const referenceTree = document.getElementById('reference-tree') as any;

	// --- State ---
	let currentReferences: VSCodeLocation[] = [];

	/**
	 * Posts a message to the extension host.
	 */
	function postMessage(message: { type: string;[key: string]: unknown }) {
		vscode.postMessage(message);
	}

	// --- Event Listeners ---

	// Listen for changes in the filter checkboxes
	filterGroup.addEventListener('change', () => {
		const filters = {
			text: textFilter?.checked ?? false,
			read: readFilter?.checked ?? false,
			write: writeFilter?.checked ?? false,
		};
		console.log("Filters changed in webview:", filters);
		postMessage({ type: 'filtersChanged', filters });
	});

	// Listen for selection changes in the tree
	referenceTree.addEventListener('vsc-tree-select', (event: CustomEvent<VscTreeSelectEventDetail>) => {
		// Get details from the event
		const detail = event.detail;
		console.log("Tree selection changed:", detail);

		if (detail) {
			// Check if the selected item is a directory (branch) or file/reference
			const isDirectoryNode = detail.itemType === 'branch' && detail.label.endsWith('/');
			const isFileNode = !isDirectoryNode && !detail.value.includes('#');
			const isReferenceNode = !isDirectoryNode && !isFileNode;
			let path = detail.path.split('/').map(x => parseInt(x));
			let item = referenceTree.getItemByPath(path);
			if (item) {
			  item.open = true;
			}
			// Path to filter by - for directories or files
			const filterPath = isReferenceNode ? null : detail.value;
			
			console.log("Selected item details:", {
				label: detail.label,
				value: detail.value,
				path: detail.path,
				itemType: detail.itemType,
				isDirectoryNode,
				isFileNode,
				isReferenceNode,
				filterPath
			});
			
			postMessage({ 
				type: 'vscSelectEvent', 
				path: filterPath,
				isDirectory: isDirectoryNode,
				isFile: isFileNode,
				isReference: isReferenceNode
			});
		} else {
			// Handle deselection if necessary, maybe show all filtered refs?
			postMessage({ type: 'vscSelectEvent', path: null, isDirectory: false, isFile: false, isReference: false });
		}
	});

	// Listen for messages from the extension host
	window.addEventListener('message', event => {
		const message = event.data; // The JSON data that the extension sent

		switch (message.type) {
			case 'updateRefs':
				currentReferences = message.refs as VSCodeLocation[];
				if (referenceTree) {
					try {
						const treeData = buildTreeData(currentReferences);
						referenceTree.data = treeData;
					} catch (error) {
						console.error("Error building tree data:", error);
						postMessage({ type: 'showError', text: `Error building reference tree: ${error}` });
					}
				}
				break;
			// Add cases for other message types if needed (e.g., classification results)
		}
	});

	// --- Initialization ---
	console.log("Webview script loaded.");
	// Signal to the extension host that the webview is ready
	postMessage({ type: 'webviewReady' });
})();
