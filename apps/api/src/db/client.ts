import { Pool } from 'pg';

import { apiConfig } from '../config.js';

export const pool = new Pool({ connectionString: apiConfig.POSTGRES_URL });
