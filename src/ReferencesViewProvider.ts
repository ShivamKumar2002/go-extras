import * as fs from 'fs';
import * as vscode from 'vscode';

export class ReferencesViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'goExtrasReferencesView';

	private _view?: vscode.WebviewView;
	private _extensionUri: vscode.Uri;

	// State
	private _currentRefs: vscode.Location[] = [];
	private _originalUri?: vscode.Uri;
	private _originalPosition?: vscode.Position;
	private _filterState = { read: true, write: true };
	private _classificationCache: Map<string, 'read' | 'write'> = new Map(); // Cache classification results

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
		this._classificationCache.clear(); // Clear cache for new reference set

		if (this._view) {
			// Pre-classify references before sending to webview (can take time)
			// Or send raw refs and let webview request classification as needed
			// For simplicity, let's send raw refs for now.
			this._postMessage({ type: 'updateRefs', refs: this._currentRefs });

			// Trigger initial filtering and peek view update
			await this.filterAndShowPeekView();
		}
	}

	/**
	 * Handles messages received from the webview UI.
	 */
	public async handleMessage(message: any) {
		switch (message.type) {
			case 'webviewReady':
				// Webview is ready, send initial data if we have it
				if (this._currentRefs.length > 0) {
					this._postMessage({ type: 'updateRefs', refs: this._currentRefs });
					await this.filterAndShowPeekView(); // Show initial peek view
				}
				return;
			case 'filtersChanged':
				this._filterState = message.filters;
				console.log('Filters changed:', this._filterState);
				await this.filterAndShowPeekView();
				return;
			case 'fileSelected':
				console.log('File selected:', message.path);
				await this.filterAndShowPeekView(message.path || undefined); // Use undefined for "all files"
				return;
			case 'requestClassification': // Example: If webview needs classification on demand
				const loc = message.location as vscode.Location;
				const classification = await this._classifyReference(loc);
				this._postMessage({ type: 'classificationResult', uri: loc.uri.toString(), range: loc.range, classification });
				return;
			case 'showError': // Allow webview to show errors
				vscode.window.showErrorMessage(message.text);
				return;
		}
	}

	/**
	 * Filters references based on current state and optional file path, then shows Peek View.
	 */
	private async filterAndShowPeekView(filePath?: string) {
		if (!this._view) {
			return;
		} // No view to update

		vscode.window.withProgress({
			location: { viewId: ReferencesViewProvider.viewType }, // Show progress in our view
			title: "Filtering references...",
		}, async (progress) => {
			try {
				const filteredLocations = await this._filterReferences(filePath);
				console.log("Filtered locations for webview: ", filteredLocations);
				this._showPeekView(filteredLocations);
			} catch (error) {
				console.error("Error filtering references:", error);
				vscode.window.showErrorMessage(`Error filtering references: ${error instanceof Error ? error.message : String(error)}`);
			}
		});
	}


	/**
	 * Filters the stored references based on the current filter state and optional file path.
	 */
	private async _filterReferences(filePath?: string): Promise<vscode.Location[]> {
		if (!this._filterState.read && !this._filterState.write) {
			return []; // Nothing to show if both are off
		}

		const targetUriString = filePath ? vscode.Uri.file(filePath).toString() : undefined;
		const filtered: vscode.Location[] = [];

		for (const loc of this._currentRefs) {
			// Filter by file path if provided
			if (targetUriString && loc.uri.toString() !== targetUriString) {
				continue;
			}

			// Filter by read/write classification
			const classification = await this._classifyReference(loc);
			if ((this._filterState.read && classification === 'read') ||
				(this._filterState.write && classification === 'write')) {
				filtered.push(loc);
			}
		}
		return filtered;
	}

	/**
	 * Classifies a reference as 'read' or 'write' based on heuristics.
	 * Caches results.
	 */
	private async _classifyReference(location: vscode.Location): Promise<'read' | 'write'> {
		const cacheKey = `${location.uri.toString()}#${location.range.start.line},${location.range.start.character}`;
		if (this._classificationCache.has(cacheKey)) {
			return this._classificationCache.get(cacheKey)!;
		}

		let classification: 'read' | 'write' = 'read'; // Default to read

		try {
			const document = await vscode.workspace.openTextDocument(location.uri);
			const lineText = document.lineAt(location.range.start.line).text;
			const refText = document.getText(location.range); // The actual symbol text
			const escapedRefText = this.escapeRegex(refText);

			// --- Write Heuristics ---
			// Remove comments and string literals for more reliable matching (basic approach)
			const codePart = lineText.split('//')[0].replace(/".*?"/g, '""').replace(/`.*?`/g, '``');

			// 1. Assignment (=, :=, op=)
			// Ensure the reference is on the left-hand side before the assignment operator
			const assignMatch = codePart.match(new RegExp(`(^|\\W)${escapedRefText}\\b.*?(=|:=)`));
			if (assignMatch) {
				const textBeforeAssign = codePart.substring(0, assignMatch.index! + assignMatch[0].length);
				// Check if it's a simple assignment or part of a comparison
				if (!/==|!=|<=|>=/.test(textBeforeAssign.slice(-3))) { // Check chars around '='
					classification = 'write';
				}
			}

			// 2. Increment/Decrement (var++, var--)
			if (classification === 'read' && new RegExp(`\\b${escapedRefText}(?:\\+\\+|--)`).test(codePart)) {
				classification = 'write';
			}

			// 3. Slice append assignment (slice = append(slice, ...))
			if (classification === 'read') {
				const appendRegex = new RegExp(`\\b${escapedRefText}\\b\\s*=\\s*append\\s*\\(\\s*${escapedRefText}\\b`);
				if (appendRegex.test(codePart)) {
					classification = 'write';
				}
			}

			// 4. Address taken and passed to function (func(&var)) - Weak heuristic
			// This is difficult to do reliably without parsing. We check if '&var' appears.
			// if (classification === 'read' && new RegExp(`&${escapedRefText}\\b`).test(codePart)) {
			// 	// Could potentially be a write, but often isn't. Maybe keep as 'read' unless stronger evidence?
			// 	// For now, let's keep it conservative and default to 'read'.
			// }


		} catch (error) {
			console.warn(`Could not classify reference at ${location.uri.fsPath}:${location.range.start.line + 1}: ${error}`);
			// Default to 'read' on error, which is already set
		}

		this._classificationCache.set(cacheKey, classification);
		return classification;
	}

	/**
	 * Executes the peekLocations command with the given locations.
	 */
	private _showPeekView(locationsToShow: vscode.Location[]) {
		if (!this._originalUri || !this._originalPosition) {
			console.warn("Cannot show peek view without original context.");
			return;
		}

		// Dismiss existing peek view before showing a new one? Maybe not necessary.
		// await vscode.commands.executeCommand('closeReferenceSearch');

		if (locationsToShow.length > 0) {
			vscode.commands.executeCommand(
				'editor.action.peekLocations',
				this._originalUri,      // URI of the document where the command was invoked
				this._originalPosition, // Position in that document
				locationsToShow,        // Locations to show in the peek view
				'peek'                  // 'peek' or 'goto', 'gotoAndPeek'
			);
		} else {
			// If no locations match the filter, maybe just close the peek view?
			// Or show a message? For now, just don't execute the command.
			console.log("No filtered locations to show in peek view.");
			// Optionally close existing peek:
			vscode.commands.executeCommand('closeReferenceSearch').then(undefined, err => {
                // Ignore errors if the peek view wasn't open
                if (err.message !== 'No reference search is active.') {
                    console.error("Error closing reference search:", err);
                }
            });
		}
	}

	/**
	 * Sends a message to the webview.
	 */
	private _postMessage(message: any) {
		if (this._view) {
			this._view.webview.postMessage(message);
		} else {
			console.warn("Attempted to post message, but webview is not available.");
		}
	}

	/**
	 * Generates the HTML content for the webview by reading index.html and injecting URIs/nonce.
	 */
	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get URIs for assets in the 'dist' folder that the webview needs to reference
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js'));
		const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'codicon.css'));
		// const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'styles.css')); // If you add styles

		// Use a nonce to whitelist inline scripts
		const nonce = getNonce();

		// Path to the index.html file within the 'dist' directory
		const htmlPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'dist', 'index.html');
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

	// Helper to escape regex special characters
	private escapeRegex(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
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
