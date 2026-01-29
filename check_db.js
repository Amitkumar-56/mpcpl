
const { executeQuery } = require('./src/lib/db');

async function check() {
  try {
    const result = await executeQuery('DESCRIBE update_invoice');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  }
}

check();
