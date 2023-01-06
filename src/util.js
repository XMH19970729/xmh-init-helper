const _ = require('lodash');

/**
 * 路由重复检查
 */
exports.assertRouteUniq = (atomicRoutes) => {
    // 检查是否有重复路由
    const checkObjectUniq = {};
    _.map(atomicRoutes, (logic) => {
        return _.map(logic, (route) => {
            const path = route.method + '|' + route.path;
            if (checkObjectUniq[path]) {
                throw new Error(`路由重复 | ${JSON.stringify(route)}`);
            } else {
                checkObjectUniq[path] = 1;
            }
        });
    });
}

/**
 * 获取接口服务的host地址
 * 数据格式
 * {
 *      _host:[pathWithMethod]
 * }
 */
exports.matchServiceHost = (services, pathWithMethod) => {
    let host = null;
    if (!services) {
        return host;
    }

    const keys = Object.keys(services);
    for (const _host of keys) {
        const routes = services[_host];
        if (routes.includes(pathWithMethod)) {
            host = _host;
            break;
        }
    }

    return host;
}

exports.replaceParamsId = (path) => {
    // 替换/:id/xx 为 /:/xx
    const keyIndex = path.indexOf(':');
    if (keyIndex >= 0) {
        const keyStr = path.substring(keyIndex);
        let key; // :id
        if (keyStr.indexOf('/') >= 0) {
            key = path.substring(keyIndex, keyIndex + keyStr.indexOf('/'));
        } else {
            key = path.substring(keyIndex);
        }
        path = path.replace(key, ':');
    }
    return path;
}

