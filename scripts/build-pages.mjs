import {cpSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../dist/',import.meta.url));
const output=fileURLToPath(new URL('../docs/',import.meta.url));
// docs/ is generated exclusively from the runnable static application in dist/.
rmSync(output,{recursive:true,force:true});mkdirSync(output,{recursive:true});
cpSync(source,output,{recursive:true});
writeFileSync(new URL('../docs/.nojekyll',import.meta.url),'');
console.log('GitHub Pages ready: docs/ (generated from dist/)');
