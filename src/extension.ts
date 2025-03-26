import * as vscode from 'vscode';
import { ReferencesViewProvider } from './ReferencesViewProvider'; // Will be created next

export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "go-extras" is now active!');

	// Instantiate and register the Webview View Provider
	const provider = new ReferencesViewProvider(context, context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ReferencesViewProvider.viewType, provider)
	);

	// Register the command
	const filterReferencesCommand = vscode.commands.registerCommand('go-extras.filterReferences', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'go') {
			vscode.window.showInformationMessage('Please open a Go file to find references.');
			return;
		}

		const uri = editor.document.uri;
		const position = editor.selection.active;

		try {
			// Ensure the Go extension is active (optional but good practice)
			const goExtension = vscode.extensions.getExtension('golang.go');
			if (!goExtension?.isActive) {
				await goExtension?.activate(); // Attempt to activate if not already
				if (!goExtension?.isActive) {
					vscode.window.showErrorMessage('Go extension (golang.go) is not active. Please ensure it is installed and enabled.');
					return;
				}
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Window,
				title: "Finding Go references...",
				cancellable: false // Reference finding is usually quick
			}, async (progress) => {
				// Execute the built-in reference provider command
				const references = await vscode.commands.executeCommand<vscode.Location[]>(
					'vscode.executeReferenceProvider',
					uri,
					position
				);

				if (!references || references.length === 0) {
					vscode.window.showInformationMessage(`No references found for symbol at ${position.line + 1}:${position.character + 1}`);
					return;
				}

				// Pass references to the view provider
				provider.setReferences(references, { uri, position });

				// Ensure the view is visible and focused
				await vscode.commands.executeCommand('goExtrasReferencesView.focus');
			});

		} catch (error) {
			console.error('Error finding references:', error);
			vscode.window.showErrorMessage(`Error finding references: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	context.subscriptions.push(filterReferencesCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
