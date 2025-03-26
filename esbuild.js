const esbuild = require("esbuild");
const fs = require("fs/promises"); // For copying assets
const path = require("path"); // For path manipulation

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(`    ${location.file}:${location.line}:${location.column}:`);
				}
			});
			console.log('[watch] build finished');
		});
	},
};

// Function to copy assets
async function copyAssets() {
	const assets = [
		{ from: 'webview-ui/index.html', to: 'dist/index.html' },
		// { from: 'webview-ui/styles.css', to: 'dist/styles.css' }, // Uncomment if styles.css is created
		{ from: path.join('node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'), to: path.join('dist', 'codicon.css') },
		{ from: path.join('node_modules', '@vscode', 'codicons', 'dist', 'codicon.ttf'), to: path.join('dist', 'codicon.ttf') },
	];
	try {
		await fs.mkdir('dist', { recursive: true });
		console.log('[copy] Ensured dist directory exists.');
	} catch (err) {
		console.error('[copy] Error creating dist directory:', err);
        throw err;
	}

	for (const asset of assets) {
		try {
			await fs.copyFile(asset.from, asset.to);
			console.log(`[copy] ${path.basename(asset.from)} -> ${asset.to}`);
		} catch (err) {
			// Handle case where source file might not exist yet (e.g., index.html, styles.css)
			if (err.code === 'ENOENT') {
				console.warn(`[copy] Source file not found, skipping: ${asset.from}`);
			} else {
				console.error(`[copy] Error copying ${asset.from}:`, err);
				throw err; // Re-throw other errors
			}
		}
	}
}


async function main() {
	// Copy assets first
	try {
		await copyAssets();
	} catch (err) {
		process.exit(1); // Exit if asset copying fails critically
	}


	const sharedConfig = {
		bundle: true,
		minify: production,
		sourcemap: !production,
		sourcesContent: false, // Reduces sourcemap size
		logLevel: 'silent', // Use plugin for errors
		plugins: [esbuildProblemMatcherPlugin],
	};

	// Context for the extension host
	const extensionCtx = await esbuild.context({
		...sharedConfig,
		entryPoints: ['src/extension.ts'],
		format: 'cjs',
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
	});

	// Context for the webview
	const webviewCtx = await esbuild.context({
		...sharedConfig,
		entryPoints: ['webview-ui/main.mts'], // Use the new .mts file
		format: 'esm', // ES Module for modern webviews
		platform: 'browser',
		outfile: 'dist/webview.js',
		// external: [], // No externals for webview bundle usually
	});

	if (watch) {
		console.log('[watch] Watching for changes...');
		await Promise.all([
			await extensionCtx.watch(),
			await webviewCtx.watch()
			// Note: Asset changes currently require a restart of the watch process
		]);
	} else {
		console.log('[build] Building extension and webview...');
		await Promise.all([
			await extensionCtx.rebuild(),
			await webviewCtx.rebuild()
		]);
		console.log('[build] Build complete.');
		await Promise.all([
			await extensionCtx.dispose(),
			await webviewCtx.dispose()
		]);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
