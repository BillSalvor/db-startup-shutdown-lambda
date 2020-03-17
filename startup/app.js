const startInstance = require('./start');

exports.lambdaHandler = async (event, context) => {

  const mysqlInstanceIdentifier = process.env.MYSQL_INSTANCE_IDENTIFIER;
  const postgresqlInstanceIdentifier = process.env.POSTGRESQL_INSTANCE_IDENTIFIER;

  var mysqlResult;
  var postgresqlResult;

  if (mysqlInstanceIdentifier) {
    mysqlResult = await startInstance(mysqlInstanceIdentifier);
  }

  if (postgresqlInstanceIdentifier) {
    postgresqlResult = await startInstance(postgresqlInstanceIdentifier);
  }

  return {
    statusCode: 200,
    body: { ...mysqlResult, ...postgresqlResult },
  }
};
