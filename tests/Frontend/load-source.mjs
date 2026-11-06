import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';

/** Transpile actual source in memory; optional boundaries are only for lifecycle tests. */
export function loadSource(relativePath, boundaries = {}) {
    const filename = fileURLToPath(
        new URL(`../../${relativePath}`, import.meta.url),
    );
    const source = readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
        fileName: filename,
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.CommonJS,
        },
    });
    const actualRequire = createRequire(filename);
    const require = (name) => boundaries.modules?.[name] ?? actualRequire(name);
    const module = { exports: {} };
    const evaluate = runInThisContext(
        `(function(require, module, exports, setTimeout, clearTimeout) { ${outputText}\n})`,
        { filename },
    );
    evaluate(
        require,
        module,
        module.exports,
        boundaries.setTimeout ?? setTimeout,
        boundaries.clearTimeout ?? clearTimeout,
    );

    return module.exports;
}
