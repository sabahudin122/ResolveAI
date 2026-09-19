import { writeFile } from 'node:fs/promises';
import { openApiSpec } from './spec.js';

await writeFile('openapi.json', `${JSON.stringify(openApiSpec, null, 2)}\n`);
