# xmh-init-helper
bhb-dp-intl-helper


```javascript

const host = 'http://127.0.0.1:3101';
//建议：单独使用一个json文件管理routes配置
const routesConfig = {
  topic: {
    getDetail: {
        funName: 'getDetail',
        path: '/topics/:id',
        method: 'get'
    }
  }
}

const defaultAgentOptions = {
			maxSockets: 100,
			maxFreeSockets: 10,
			timeout: 60000,
			freeSocketTimeout: 30000
}; // 这个是默认agent配置，可以根据项目情况设置

const helper = require('bhb-dp-intl-helper')('atomic',{host, routesConfig, agent:defaultAgentOptions});

// 如果有多服务需要装载,只有原子服务时不需要执行此函数
await hepler.init({initPath});

hepler.topic.getDetail({params: {id: '5bc68bc815740396d9a6dc21'}})
  .then(function(data) {
    console.log('执行成功:', data);
  })
  .catch(function(err) {
    console.log('执行失败:', err);
  });
```	
版本
---
	- 1.0.0 项目初建
	- 1.0.1 修复query传参bug，优化默认可以不传参
  - 1.0.2 修复config值覆盖的bug
  - 1.0.3 修复symbol 克隆失效问题
  - 1.0.4 设置超时时间1秒
  - 1.0.5 超时时间支持自定义
  - 1.0.6 新增404错误信息优化处理
  - 1.0.7 新增header自定义支持
  - 1.0.8 超时异常信息处理
  - 1.0.9 超时异常增加message
  - 1.1.0 修改默认超时时间为2秒
  - 1.2.0 设置keep-alive保持TCP连接
  - 1.2.1 修复keep-alive实例化问题
  - 1.2.2 更改freeSocketTimeout 为5000ms，因为node server默认 server.keepAliveTimeout就是5000ms
  - 1.3.1 更改freeSocketTimeout为30000ms，开启请求重试规则
  - 1.3.2 超时重试，只是重试GET请求
  - 1.3.3 超时时间配置按照官方推荐设置30s,60s
  - 1.3.4 agent可以根据传参设置
  - 2.0.0 调用init需要等待请求
  - 2.1.0 服务注册支持异步同化执行，修改配置加载方式
  - 2.2.0 服务识别增加支持params id方式
  - 2.2.1 服务增加hostname这个header信息请求传参
  - 2.2.3 修复没有HOSTNAME环境变量报错
  - 2.3.3 增加全局的定义header信息
  - 2.3.4 初始化参数做clone处理
  - 2.3.5 clone当参数为空值异常处理