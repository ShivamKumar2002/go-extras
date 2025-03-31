import * as fs from 'fs';
import * as vscode from 'vscode';

enum Classification {
	Unknown = -1,
	Text = 0,
	Read = 1,
	Write = 2,
}

class FilterState {
	read: boolean;
	write: boolean;
	text: boolean;

	constructor(read?: boolean, write?: boolean, text?: boolean) {
		this.read = read ?? true;
		this.write = write ?? true;
		this.text = text ?? true;
	}

	compare(other: FilterState): boolean {
		return this.read === other.read && this.write === other.write && this.text === other.text;
	};
}

export class ReferencesViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'goExtrasReferencesView';

	private _view?: vscode.WebviewView;
	private _extensionUri: vscode.Uri;

	// State
	private _currentRefs: vscode.Location[] = [];
	private _originalUri?: vscode.Uri;
	private _originalPosition?: vscode.Position;
	private _filterState = new FilterState();

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext, // Store context if needed later
		extensionUri: vscode.Uri
	) {
		this._extensionUri = extensionUri;
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			// Restrict the webview to only loading content from our extension's `dist` directory
			localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')]
		};

		// Set the HTML content
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			message => this.handleMessage(message),
			undefined,
			this._extensionContext.subscriptions // Use context subscriptions for disposal
		);

		// Let the webview know we are ready (optional, can be done after setting refs)
		// this._postMessage({ type: 'providerReady' });
	}

	/**
	 * Stores the references and context, then updates the webview.
	 */
	public async setReferences(refs: vscode.Location[], context: { uri: vscode.Uri, position: vscode.Position }) {
		this._currentRefs = refs;
		this._originalUri = context.uri;
		this._originalPosition = context.position;

		if (this._view) {
			// Apply initial filtering and update peek view
			await this.filterAndUpdatePeekView(undefined, undefined, true);
		}
	}

	/**
	 * Handles messages received from the webview UI.
	 */
	public async handleMessage(message: any) {
		console.log("Provider received message from webview:", message);
		switch (message.type) {
			case 'webviewReady':
				// Webview is ready, send initial data if we have it
				if (this._currentRefs.length > 0) {
					await this.filterAndUpdatePeekView(undefined, undefined, true); // Show initial peek view
				}
				return;

			case 'filtersChanged':
				if (this._filterState.compare(message.filters)) {
					return;
				}
				this._filterState.read = message.filters.read;
				this._filterState.write = message.filters.write;
				this._filterState.text = message.filters.text;
				console.log('Provider received filters changed:', this._filterState);
				await this.filterAndUpdatePeekView(undefined, undefined, true);
				return;

			case 'vscSelectEvent':
				console.log('Tree item selected:', message.path);
				
				// If this is a reference node (leaf), navigate directly to the position
				if (message.isReference) {
					// Close any existing peek view first
					this._hidePeekView();

					console.log("Navigating to reference location:", message.path);
					
					// Open the file and navigate to the specified location
					const [filePath, filePosition] = message.path.split('#');
					const [line, char] = filePosition.split(':');
					const position = new vscode.Position(Number(line) - 1, Number(char) - 1);
					const location = new vscode.Location(vscode.Uri.file(filePath), position);
					await this._openFileAtLocation(location);
					return;
				}
				
				// For directories and files, use the existing filtering mechanism
				await this.filterAndUpdatePeekView(message.path || undefined, message.isDirectory || false); 
				return;

			case 'requestClassification': // Example: If webview needs classification on demand
				const loc = message.location as vscode.Location;
				let classification: Classification;
				try {
					classification = await this._classifyReferenceGopls(loc);
				} catch (err) {
					console.error("Error classifying reference at location:", loc, ", err:", err);
					classification = Classification.Unknown;
				}
				await this._postMessage({ type: 'classificationResult', uri: loc.uri.toString(), range: loc.range, classification });
				return;

			case 'showError': // Allow webview to show errors
				vscode.window.showErrorMessage(message.text);
				return;
		}
	}

	private _hidePeekView() {
		vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup').then(() => {
			vscode.commands.executeCommand('closeReferenceSearch');
		});
	}

	/**
	 * Filters references based on current state and updates the Peek View only.
	 * If updateWebview is true, also updates the webview tree with filtered locations.
	 */
	private async filterAndUpdatePeekView(filePath?: string, isDirectory: boolean = false, updateWebview: boolean = false) {
		// Do nothing if there are no references
		if (!this._currentRefs) {
			return;
		}

		await vscode.window.withProgress({
			location: { viewId: ReferencesViewProvider.viewType }, // Show progress in our view
			title: "Filtering references...",
		}, async (progress) => {
			try {
				// Clear views before filtering
				this._hidePeekView();

				// Filter based on the latest _filterState and optional filePath
				const filteredLocations = await this._filterReferences(filePath, isDirectory);

				if (updateWebview) {
					// update webview tree with filtered locations
					await this._postMessage({ type: 'updateRefs', refs: filteredLocations });
				}

				// Update the Peek View only
				this._showPeekView(filteredLocations);

			} catch (error) {
				console.error("Error filtering references:", error);
				vscode.window.showErrorMessage(`Error filtering references: ${error instanceof Error ? error.message : String(error)}`);
				// Clear peek view on error
				this._hidePeekView();
			}
		});
	}

	/**
	 * Filters the stored references based on the current filter state and optional file path.
	 * This is now primarily used internally by filterAndUpdateViews and filterAndShowPeekView.
	 */
	private async _filterReferences(filePath?: string, isDirectory: boolean = false): Promise<vscode.Location[]> {
		if (!this._filterState.read && !this._filterState.write && !this._filterState.text) {
			return []; // Nothing to show if all filters are off
		}

		console.log(`Filtering references with path: ${filePath}, isDirectory: ${isDirectory}`);
		
		// Convert file path to URI if provided
		const targetUri = filePath ? vscode.Uri.file(filePath) : undefined;
		const filtered: vscode.Location[] = [];

		for (const loc of this._currentRefs) {
			// Filter by file path if provided
			if (targetUri) {
				if (isDirectory) {
					// For directories, check if the location URI's path starts with the target directory path
					// We need to ensure we match at directory boundaries
					const targetDirPath = targetUri.path.endsWith('/') ? targetUri.path : targetUri.path + '/';
					const locPath = loc.uri.path;
					
					// Debug log for path matching
					console.log(`Comparing dir paths - Target: ${targetDirPath}, Location: ${locPath}, startsWith: ${locPath.startsWith(targetDirPath)}`);
					
					if (!locPath.startsWith(targetDirPath)) {
						continue;
					}
				} else {
					// For files, exact path matching is required (normalizing both paths)
					const targetPath = targetUri.path;
					const locPath = loc.uri.path;
					
					// Debug log for file matching
					console.log(`Comparing file paths - Target: ${targetPath}, Location: ${locPath}, equal: ${locPath === targetPath}`);
					
					if (locPath !== targetPath) {
						continue;
					}
				}
			}

			// Filter by read/write classification
			let classification: Classification;
			try {
				classification = await this._classifyReferenceGopls(loc);
			} catch (err) {
				console.error("Error classifying reference at location:", loc, ", err:", err);
				classification = Classification.Unknown;
			}

			if ((this._filterState.read && classification === Classification.Read) ||
				(this._filterState.write && classification === Classification.Write) ||
				(this._filterState.text && classification === Classification.Text)) {
				filtered.push(loc);
			}
		}
		
		console.log(`Filtered ${this._currentRefs.length} references down to ${filtered.length}`);
		return filtered;
	}

	/**
	 * Accurately classifies a Go identifier reference at a given location as 'read' or 'write'
	 * by leveraging the Go language server (gopls) via the 'textDocument/documentHighlight' LSP request.
	 *
	 * This approach relies on gopls correctly identifying and tagging symbol usages.
	 *
	 * @param location The precise location (URI and range) of the identifier reference.
	 * @returns Classification of the reference as 'text', 'read', 'write', or 'unknown'.
	 */
	private async _classifyReferenceGopls(location: vscode.Location): Promise<Classification> {
		const uri = location.uri;
		// Use the start position of the range to request highlights
		const position = location.range.start;

		// Execute the command that triggers the 'textDocument/documentHighlight' LSP request
		const highlights = await vscode.commands.executeCommand<vscode.DocumentHighlight[]>('vscode.executeDocumentHighlights', uri, position);

		if (!highlights || highlights.length === 0) {
			return Classification.Unknown; // Or potentially fallback to 'read'? 'unknown' is safer.
		}

		// Find the specific highlight that matches the *exact* input range
		let selectedHighlight = highlights.find(h => h.range.isEqual(location.range));

		if (!selectedHighlight) {
			// This might happen if the location is slightly off, or gopls doesn't highlight
			// this specific instance for some reason (e.g., it's a comment, string, or part of a package name)
			// Or if the input location range doesn't exactly match what gopls considers the symbol range.
			// Fallback: Check if *any* highlight at this position indicates a write.
			// This is less precise but might catch cases where ranges differ slightly.
			const overlappingHighlight = highlights.find(h => h.range.contains(position));
			if (overlappingHighlight) {
				selectedHighlight = overlappingHighlight;
			}
		}

		if (!selectedHighlight) {
			return Classification.Unknown;
		}

		// We found the exact highlight for our input location range
		switch (selectedHighlight.kind) {
			case vscode.DocumentHighlightKind.Write:
				// This includes assignments (=, :=), increment/decrement (++ --),
				// declarations (var x = ..., x := ...), function parameters being set in a call, etc.
				return Classification.Write;

			case vscode.DocumentHighlightKind.Read:
				// Used in expressions, conditions, function calls (reading the value), etc.
				return Classification.Read;

			case vscode.DocumentHighlightKind.Text:
				return Classification.Text;

			default:
				return Classification.Unknown;
		}
	}

	/**
	 * Opens a file at the specified location
	 */
	private async _openFileAtLocation(location: vscode.Location) {
		try {
			// Open the document and show it in the editor with the cursor at the specified position
			const document = await vscode.workspace.openTextDocument(location.uri);
			await vscode.window.showTextDocument(document, {
				selection: location.range,
				viewColumn: vscode.ViewColumn.Active
			});
		} catch (error) {
			console.error("Error opening file at location:", error);
			vscode.window.showErrorMessage(`Error navigating to reference: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Executes the peekLocations command with the given locations.
	 */
	private _showPeekView(locationsToShow: vscode.Location[]) {
		if (!this._originalUri || !this._originalPosition) {
			console.warn("Cannot show peek view without original context.");
			return;
		}

		if (!locationsToShow) {
			// If no locations match the filter, maybe just close the peek view?
			// Or show a message? For now, just don't execute the command.
			console.log("No filtered locations to show in peek view.");
			return;
		}

		console.log("Peek view locations:", locationsToShow);
		vscode.commands.executeCommand(
			'editor.action.showReferences',
			this._originalUri,      // URI of the document where the command was invoked
			this._originalPosition, // Position in that document
			locationsToShow,        // Locations to show in the peek view
			'peek'                  // 'peek' or 'goto', 'gotoAndPeek'
		);
	}

	/**
	 * Sends a message to the webview.
	 */
	private async _postMessage(message: any) {
		if (this._view) {
			const sent = await this._view.webview.postMessage(message);
			if (!sent) {
				console.error("Failed to post message to webview:", message);
			}
		} else {
			console.warn("Attempted to post message, but webview is not available.");
		}
	}

	/**
	 * Generates the HTML content for the webview by reading index.html and injecting URIs/nonce.
	 */
	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get URIs for assets in the 'dist' folder that the webview needs to reference
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'ReferencesWebview.js'));
		const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'codicon.css'));
		// const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'styles.css')); // If you add styles

		// Use a nonce to whitelist inline scripts
		const nonce = getNonce();

		// Path to the index.html file within the 'dist' directory
		const htmlPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'dist', 'references.html');
		let htmlContent: string;

		try {
			// Read the HTML file from disk
			htmlContent = fs.readFileSync(htmlPathOnDisk.fsPath, 'utf8');

			// Replace placeholders in the HTML file with actual values
			htmlContent = htmlContent.replace(/{{cspSource}}/g, webview.cspSource);
			htmlContent = htmlContent.replace(/{{nonce}}/g, nonce);
			htmlContent = htmlContent.replace(/{{scriptUri}}/g, scriptUri.toString()); // Ensure it's a string
			htmlContent = htmlContent.replace(/{{codiconsUri}}/g, codiconsUri.toString());
			// htmlContent = htmlContent.replace(/{{stylesUri}}/g, stylesUri.toString()); // If you add styles

		} catch (error) {
			console.error(`Error reading webview HTML file: ${htmlPathOnDisk.fsPath}`, error);
			// Return a fallback error HTML
			return `<!DOCTYPE html>
				<html lang="en">
				<head><meta charset="UTF-8"><title>Error</title></head>
				<body>
					<h1>Error loading webview content</h1>
					<p>Could not read file: ${htmlPathOnDisk.fsPath}</p>
					<p>${error instanceof Error ? error.message : String(error)}</p>
				</body>
				</html>`;
		}

		return htmlContent;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
