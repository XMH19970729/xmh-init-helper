const superagent = require('superagent');
const _ = require('lodash');
const Agent = require('agentkeepalive');
/** 
 * 
 config 数据模型
{
	topic: {
		getTopicDetail: {
			funName:'getTopicDetail',
			path: '/topics/:id',
			method: 'get'
		}
	}
}
*/
class HelperProxy {
	constructor({ host, routesConfig, agent = {} }) {
		this.host = host;
		const agentOptions = _.assign({
			maxSockets: 100,
			maxFreeSockets: 10,
			timeout: 60000,
			freeSocketTimeout: 30000
		}, agent);
		const keepaliveAgent = new Agent(agentOptions);
		_.each(routesConfig, (data, service) => {
			_.each(data, (config) => {
				if (!config.funName || !config.path || !config.method) {
					throw new Error('无效的路由参数配置:routesConfig');
				}
				this.register(service, config, keepaliveAgent);
			});
		});
	}
	register(service, config, keepaliveAgent) {
		if (!this[service]) {
			this[service] = {};
		}
		config.host = this.host;
		const fun = function (options = {}) {
			const { body, query, params, headers } = _.cloneDeep(options);
			const config = _.cloneDeep(this.config);
			if (params) {
				_.each(params, (v, k) => {
					config.path = config.path.replace(`:${k}`, v);
				});
			}
			const url = config.host + config.path;
			const timeout = config.timeout || 2000;
			let request = superagent[config.method](url);
			if (body) {
				request = request.send(body);
			}
			if (query) {
				request = request.query(query);
			}
			if (headers && _.isObject(headers)) {
				_.each(headers, (v, k) => {
					request.set(k, v);
				})
			}
			return request
				.timeout(timeout)
				.agent(keepaliveAgent)
				.retry(2, (e) => {
					if (!e) {
						return false;
					}
					// 超时重试,只是重试GET请求
					if (e && e.errno === 'ETIME' && request.method === 'GET') {
						return true;
					}
					// 另一端突然关闭了其连接的末端
					if (e && e.code === 'ECONNRESET') {
						return true;
					}
					return false;
				})
				.then(function (res) {
					if (!res.body) {
						throw new Error(`请求出错 ${JSON.stringify(config)}`);
					}
					if (res.body.code !== 0) {
						throw new Error(res.body.message);
					}
					return res.body.data || null;
				})
				.catch(function (e) {
					if (!e) {
						throw e;
					}
					if (e.errno === 'ETIME') {
						const message = `请求:${url} 超时 :${timeout}ms`;
						throw {
							errno: 'ETIME',
							code: 'ECONNABORTED',
							timeout,
							url,
							msg: message,
							message
						};
					}
					if (e.message === 'Not Found') {
						throw new Error(`Not Found ${request.method} ${request.url}`);
					}
					throw e;
				});
		}
		this[service][config.funName] = fun.bind({ config });
	}
};

const services = {};
module.exports = function (serviceName) {
	if (services[serviceName]) {
		return services[serviceName];
	}
	const proxy = {
		init: ({ host, routesConfig, agent }) => {
			const helper = new HelperProxy({ host, routesConfig, agent });
			services[serviceName] = helper;
			_.each(services[serviceName], (attr, k) => {
				proxy[k] = attr;
			});
			return services[serviceName];
		}
	}
	return proxy;
}