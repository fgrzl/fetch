import { FetchClient } from '../src/client/fetch-client';
import { useCSRF } from '../src/middleware/csrf';

const client = new FetchClient();
const result = useCSRF(client);

console.log('Type of result:', typeof result);
console.log('Result has post method:', 'post' in result);
console.log('Result:', result);
