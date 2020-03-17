const stopInstance = require('./stop');

exports.lambdaHandler = async (event, context) => {

  const mysqlInstanceIdentifier = process.env.MYSQL_INSTANCE_IDENTIFIER;
  const postgresqlInstanceIdentifier = process.env.POSTGRESQL_INSTANCE_IDENTIFIER;

  var mysqlResult;
  var postgresqlResult;

  if (mysqlInstanceIdentifier) {
    mysqlResult = await stopInstance(mysqlInstanceIdentifier);
  }

  if (postgresqlInstanceIdentifier) {
    postgresqlResult = await stopInstance(postgresqlInstanceIdentifier);
  }

  return {
    statusCode: 200,
    body: { ...mysqlResult, ...postgresqlResult },
  }
};
