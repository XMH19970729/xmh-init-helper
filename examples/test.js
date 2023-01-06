
const host = 'http://127.0.0.1:5401';

// 设置请求服务名
process.env.HOSTNAME = 'demo';

const routesConfig = {
	topic: {
		getDetail: {
			funName: 'getDetail',
			path: '/topics/:id',
			method: 'get',
			timeout: 1000
		},
		setPrice: {
			funName: 'getDetail',
			path: '/topics/:id/price',
			method: 'get',
			timeout: 1000
		}
	},
	follow: {
		total: {
			funName: 'total',
			path: '/follow/total',
			method: 'get',
			timeout: 1000
		}
	},
	timeline: {
		pushData: {
			funName: 'pushData',
			path: '/timelines/wait/:id',
			method: 'post',
		}
	}
}

const hepler = require('../')('atomic', { host, routesConfig, agent: { freeSocketTimeout: 2000 }, headers: { app: 1 } });

hepler.init({ initPath: '/home/route/init' })
	.then(function() {
		const atomicHelper = require('../')('atomic');
		atomicHelper.timeline.pushData({ params: { id: '5d6799d8fd3ef83c1d1b3d67' }, headers: { app: 344 }, })
			.then(function(data) {
				console.log('执行成功:', data);
			})
			.catch(function(err) {
				console.log('执行失败:', err);
			});
	});

