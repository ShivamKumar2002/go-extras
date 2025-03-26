// Import components for side effects (registers custom elements)
import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-checkbox-group';
import '@vscode-elements/elements/dist/vscode-tree';

// Import types from the main package entry point or a dedicated types file if available
import type { VscodeCheckbox as Checkbox, VscodeCheckboxGroup as CheckboxGroup, VscodeTree as Tree } from '@vscode-elements/elements';

// Define the structure for VS Code Location data (simplified)
interface VSCodeLocation {
	uri: {
		scheme: string;
		authority: string;
		path: string;
		query: string;
		fragment: string;
		fsPath: string; // Most useful for display
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

// --- VS Code API Setup ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

// --- DOM Element References ---
const filterGroup = document.getElementById('filter-group') as CheckboxGroup | null;
const textFilter = document.getElementById('text-filter') as Checkbox | null;
const readFilter = document.getElementById('read-filter') as Checkbox | null;
const writeFilter = document.getElementById('write-filter') as Checkbox | null;
const referenceTree = document.getElementById('reference-tree') as Tree | null;

// --- State ---
let currentReferences: VSCodeLocation[] = [];

// --- Helper Functions ---

/**
 * Transforms VSCodeLocation[] into the nested structure required by vscode-tree.
 */
function buildTreeData(refs: VSCodeLocation[]): TreeItemData[] {
	const fileMap = new Map<string, { label: string; value: string; subItems: TreeItemData[] }>();

	for (const ref of refs) {
		const filePath = ref.uri.fsPath;
		const fileName = filePath.substring(filePath.lastIndexOf('/') + 1); // Basic filename extraction
		const lineNum = ref.range[0].line + 1; // 1-based line number
		const charNum = ref.range[0].character + 1;

		if (!fileMap.has(filePath)) {
			fileMap.set(filePath, {
				label: fileName, // Display filename as top-level node
				value: filePath, // Store full path in value
				subItems: []
			});
		}

		// Add reference line as a sub-item
		fileMap.get(filePath)?.subItems.push({
			label: `Line ${lineNum}:${charNum}`,
			value: `${filePath}#${lineNum}:${charNum}`, // Unique value for the specific reference
			icons: { leaf: 'symbol-field' } // Example icon
		});
	}

	// Convert map values to array and add icons
	const treeData: TreeItemData[] = Array.from(fileMap.values()).map(fileNode => ({
		...fileNode,
		icons: { branch: 'folder', open: 'folder-opened' },
		// Sort sub-items (references) by line number
		subItems: fileNode.subItems.sort((a, b) => {
			const lineA = parseInt(a.label.match(/Line (\d+):/)?.[1] || '0');
			const lineB = parseInt(b.label.match(/Line (\d+):/)?.[1] || '0');
			return lineA - lineB;
		})
	}));

	// Sort top-level file nodes alphabetically by label (filename)
	treeData.sort((a, b) => a.label.localeCompare(b.label));

	return treeData;
}

/**
 * Posts a message to the extension host.
 */
function postMessage(message: { type: string; [key: string]: unknown }) {
	vscode.postMessage(message);
}

// --- Event Listeners ---

// Listen for messages from the extension host
window.addEventListener('message', event => {
	const message = event.data; // The JSON data that the extension sent
	console.log("Webview received message:", message);

	switch (message.type) {
		case 'updateRefs':
			currentReferences = message.refs as VSCodeLocation[];
			if (referenceTree) {
				try {
					const treeData = buildTreeData(currentReferences);
					referenceTree.data = treeData;
					console.log("Tree data updated:", treeData);
				} catch (error) {
					console.error("Error building tree data:", error);
					postMessage({ type: 'showError', text: `Error building reference tree: ${error}` });
				}
			}
			break;
		// Add cases for other message types if needed (e.g., classification results)
	}
});

// Listen for changes in the filter checkboxes
filterGroup?.addEventListener('change', () => {
	const filters = {
		text: textFilter?.checked ?? false,
		read: readFilter?.checked ?? false,
		write: writeFilter?.checked ?? false,
	};
	console.log("Filters changed in webview:", filters);
	postMessage({ type: 'filtersChanged', filters });
});

// Listen for selection changes in the tree
referenceTree?.addEventListener('vsc-select', (event: any) => {
	// The detail contains information about the selected item
	const selectedItem = event.detail?.item;
	console.log("Tree selection changed:", selectedItem);

	if (selectedItem) {
		// Check if the selected item is a file node (has subItems) or a reference node
		// We stored the full file path in the 'value' of the file nodes.
		// Reference nodes have value like 'filepath#line:char'
		const isFileNode = selectedItem.value && !selectedItem.value.includes('#');
		const filePath = isFileNode ? selectedItem.value : null;

		postMessage({ type: 'fileSelected', path: filePath });
	} else {
        // Handle deselection if necessary, maybe show all filtered refs?
        postMessage({ type: 'fileSelected', path: null }); // Send null path for "all files"
    }
});

// --- Initialization ---
console.log("Webview script loaded.");
// Signal to the extension host that the webview is ready
postMessage({ type: 'webviewReady' });
