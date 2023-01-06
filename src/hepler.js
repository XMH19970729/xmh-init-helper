const superagent = require('superagent');
const _ = require('lodash');
const Agent = require('agentkeepalive');
const common = require('./util.js');
const hostname = process.env.HOSTNAME || 'local';
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
	constructor({ host, routesConfig, agent = {}, closeKeepalive, pathsInService, headers }) {
		// 验证路由是否有重复Path，有的话不允许启动
		common.assertRouteUniq(routesConfig);

		const agentOptions = _.assign({
			maxSockets: 100,
			maxFreeSockets: 10,
			timeout: 60000,
			freeSocketTimeout: 30000
		}, agent);
		const keepaliveAgent = closeKeepalive ? null : new Agent(agentOptions);

		_.each(routesConfig, (data, service) => {
			_.each(data, (config) => {
				if (!config.funName || !config.path || !config.method) {
					throw new Error('无效的路由参数配置:routesConfig');
				}

				const pathWithMethod = `${config.method.toUpperCase()}|${common.replaceParamsId(config.path)}`;
				// 设置对应的服务地址
				config.host = common.matchServiceHost(pathsInService, pathWithMethod) || host;

				this.register(service, config, keepaliveAgent, headers);
			});
		});

	}

	/**
	 * 服务注册
	 * @param {*} service 服务
	 * @param {*} config 路由配置
	 * @param {*} keepaliveAgent 连接存活设置
	 * @param {*} defaultHeaders 默认头部设置
	 */
	register(service, config, keepaliveAgent, defaultHeaders) {
		if (!this[service]) {
			this[service] = {};
		}

		const fun = function(options = {}) {
			let { body, query, params, headers } = _.cloneDeep(options);
			const config = _.cloneDeep(this.config);
			if (params) {
				_.each(params, (v, k) => {
					config.path = config.path.replace(`:${k}`, v);
				});
			}

			// 公共头部信息
			if (!_.isEmpty(defaultHeaders)) {
				headers = Object.assign(defaultHeaders, headers);
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

			if (_.isObject(headers)) {
				_.each(headers, (v, k) => {
					request = request.set(k, v);
				})
			}

			if (keepaliveAgent) {
				request = request.agent(keepaliveAgent);
			}

			if (timeout) {
				request = request.timeout(timeout);
			}

			request = request.set('hostname', hostname);

			return request
				.retry(1, (e) => {
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
				.then(function(res) {
					if (!res.body) {
						throw new Error(`请求出错 ${JSON.stringify(config)}`);
					}
					if (res.body.code !== 0) {
						throw new Error(res.body.message);
					}
					return res.body.data || null;
				})
				.catch(function(e) {
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
module.exports = function(serviceName, options) {
	const { host, routesConfig, agent, closeKeepalive, headers } = _.cloneDeep(options || {});
	if (services[serviceName]) {
		return services[serviceName];
	}
	if (!host) {
		return null;
	}
	const proxy = {
		init: async ({ initPath }) => {
			let pathsInService = null;
			if (initPath) {
				// 获取服务配置
				const pathsInServiceResponse = await superagent.get(host + initPath).set('hostname', hostname).timeout(2000);
				pathsInService = pathsInServiceResponse.body.data || {};
			}
			proxy.registerService(pathsInService);
		},
		registerService: (pathsInService) => {
			const helper = new HelperProxy({ host, routesConfig, agent, closeKeepalive, pathsInService, headers });
			services[serviceName] = helper;
			_.each(services[serviceName], (attr, k) => {
				proxy[k] = attr;
			});
			return services[serviceName];
		}
	}

	// 服务注册
	proxy.registerService();

	return proxy;
}