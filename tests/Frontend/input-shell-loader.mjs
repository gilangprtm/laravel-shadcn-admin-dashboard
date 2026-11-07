import { existsSync } from 'node:fs';
import { loadSource } from './load-source.mjs';

/** Actual TS/shadcn sources; only explicit overrides below are boundary adapters. */
export function shellLoader(overrides = {}) {
    const cache = new Map();
    function load(path) {
        if (cache.has(path)) {
            return cache.get(path);
        }

        const modules = new Proxy(overrides, {
            get(target, name) {
                if (name in target) {
                    return target[name];
                }

                if (name === 'lucide-react') {
                    return load(
                        'node_modules/lucide-react/dist/cjs/lucide-react.js',
                    );
                }

                if (typeof name === 'string' && name.startsWith('@/')) {
                    const base = `resources/js/${name.slice(2)}`;
                    const file = ['.tsx', '.ts', '/index.ts']
                        .map((ext) => base + ext)
                        .find((file) => existsSync(file));

                    if (file) {
                        return load(file);
                    }
                }

                return undefined;
            },
        });
        const result = loadSource(path, { modules });
        cache.set(path, result);

        return result;
    }

    return load;
}
export const loadShellSource = shellLoader();
