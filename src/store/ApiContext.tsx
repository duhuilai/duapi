import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type {
  AppState, ApiGroup, ApiEndpoint, HttpMethod,
  UrlParam, RequestHeader, AuthType, AuthConfig,
  Environment, ApiResponse, ExportFormat, ResponseParam,
} from '../types';
import { loadData, saveData, generateId } from '../utils/storage';

// ---- JSON 解析工具 ----
function inferType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function parseJsonToParams(json: unknown, prefix = ''): ResponseParam[] {
  if (json === null || json === undefined) return [];

  if (typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    return Object.entries(obj).map(([key, value]) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const type = inferType(value);
      const children = (type === 'object' || type === 'array') ? parseJsonToParams(
        type === 'array' && Array.isArray(value) && value.length > 0 ? value[0] : value,
        type === 'array' ? `${fullPath}[]` : fullPath
      ) : undefined;
      return {
        id: generateId(),
        path: fullPath,
        type: children && children.length > 0 ? `${type}(${children.length})` : type,
        description: '',
        required: true,
        children: children && children.length > 0 ? children : undefined,
      };
    });
  }

  return [];
}

// ---- Initial Data ----

const defaultGroups: ApiGroup[] = [
  {
    id: 'group-users',
    name: '用户模块',
    icon: 'U',
    iconColor: '#1E40AF',
    collapsed: false,
    endpoints: [
      {
        id: 'api-get-user',
        name: '获取用户信息',
        method: 'GET',
        url: '{{base_url}}/api/v1/users/{{userId}}',
        params: [
          { id: 'p1', name: 'userId', value: '{{userId}}', description: '用户ID', enabled: true },
          { id: 'p2', name: 'include', value: 'profile,roles', description: '附加字段', enabled: true },
        ],
        headers: [
          { id: 'h1', key: 'Content-Type', value: 'application/json', description: '数据格式', enabled: true },
          { id: 'h2', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '',
        bodyType: 'none',
        preScript: '// 设置变量\npm.variables.set("timestamp", new Date().toISOString());',
        testScript: '// 状态码测试\npm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});',
        description: '根据用户ID获取用户详细信息',
        responseParams: [],
      },
      {
        id: 'api-create-user',
        name: '创建用户',
        method: 'POST',
        url: '{{base_url}}/api/v1/users',
        params: [],
        headers: [
          { id: 'h1', key: 'Content-Type', value: 'application/json', description: '数据格式', enabled: true },
          { id: 'h2', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '{\n    "name": "张三",\n    "email": "zhangsan@corp.com",\n    "role": "admin"\n}',
        bodyType: 'json',
        preScript: '',
        testScript: 'pm.test("Status code is 201", function () {\n    pm.response.to.have.status(201);\n});',
        description: '创建新用户',
        responseParams: [],
      },
      {
        id: 'api-update-user',
        name: '更新用户',
        method: 'PUT',
        url: '{{base_url}}/api/v1/users/{{userId}}',
        params: [
          { id: 'p1', name: 'userId', value: '{{userId}}', description: '用户ID', enabled: true },
        ],
        headers: [
          { id: 'h1', key: 'Content-Type', value: 'application/json', description: '数据格式', enabled: true },
          { id: 'h2', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '{\n    "name": "张三",\n    "email": "zhangsan@corp.com"\n}',
        bodyType: 'json',
        preScript: '',
        testScript: '',
        description: '更新用户信息',
        responseParams: [],
      },
      {
        id: 'api-delete-user',
        name: '删除用户',
        method: 'DELETE',
        url: '{{base_url}}/api/v1/users/{{userId}}',
        params: [
          { id: 'p1', name: 'userId', value: '{{userId}}', description: '用户ID', enabled: true },
        ],
        headers: [
          { id: 'h2', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '',
        bodyType: 'none',
        preScript: '',
        testScript: 'pm.test("Status code is 204", function () {\n    pm.response.to.have.status(204);\n});',
        description: '删除指定用户',
        responseParams: [],
      },
    ],
  },
  {
    id: 'group-orders',
    name: '订单模块',
    icon: 'O',
    iconColor: '#16A34A',
    collapsed: false,
    endpoints: [
      {
        id: 'api-create-order',
        name: '创建订单',
        method: 'POST',
        url: '{{base_url}}/api/v1/orders',
        params: [],
        headers: [
          { id: 'h1', key: 'Content-Type', value: 'application/json', description: '数据格式', enabled: true },
          { id: 'h2', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '{\n    "productId": "prod_001",\n    "quantity": 2,\n    "amount": 199.99\n}',
        bodyType: 'json',
        preScript: '',
        testScript: 'pm.test("创建成功", function () {\n    pm.response.to.have.status(201);\n});',
        description: '创建新订单',
        responseParams: [],
      },
      {
        id: 'api-list-orders',
        name: '查询订单列表',
        method: 'GET',
        url: '{{base_url}}/api/v1/orders',
        params: [
          { id: 'p1', name: 'page', value: '1', description: '页码', enabled: true },
          { id: 'p2', name: 'pageSize', value: '20', description: '每页条数', enabled: true },
          { id: 'p3', name: 'status', value: 'pending', description: '订单状态', enabled: false },
        ],
        headers: [
          { id: 'h1', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '',
        bodyType: 'none',
        preScript: '',
        testScript: 'pm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});',
        description: '分页查询订单列表',
        responseParams: [],
      },
    ],
  },
  {
    id: 'group-payment',
    name: '支付模块',
    icon: 'P',
    iconColor: '#D97706',
    collapsed: false,
    endpoints: [
      {
        id: 'api-create-payment',
        name: '发起支付',
        method: 'POST',
        url: '{{base_url}}/api/v1/payments',
        params: [],
        headers: [
          { id: 'h1', key: 'Content-Type', value: 'application/json', description: '数据格式', enabled: true },
          { id: 'h2', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '{\n    "orderId": "ord_001",\n    "method": "wechat",\n    "amount": 199.99\n}',
        bodyType: 'json',
        preScript: '',
        testScript: 'pm.test("支付发起成功", function () {\n    pm.response.to.have.status(200);\n});',
        description: '发起支付请求',
        responseParams: [],
      },
      {
        id: 'api-query-payment',
        name: '查询支付结果',
        method: 'GET',
        url: '{{base_url}}/api/v1/payments/{{paymentId}}',
        params: [
          { id: 'p1', name: 'paymentId', value: '{{paymentId}}', description: '支付ID', enabled: true },
        ],
        headers: [
          { id: 'h1', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
        ],
        auth: { type: 'bearer', bearerToken: '{{token}}' },
        body: '',
        bodyType: 'none',
        preScript: '',
        testScript: 'pm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});',
        description: '查询支付结果',
        responseParams: [],
      },
    ],
  },
];

const defaultEnvironments: Environment[] = [
  {
    id: 'env-dev',
    name: '开发环境 dev',
    variables: {
      base_url: 'http://localhost:3000',
      userId: '1024',
      token: 'eyJhbGciOiJIUzI1NiIs...',
      paymentId: 'pay_001',
    },
  },
  {
    id: 'env-test',
    name: '测试环境 test',
    variables: {
      base_url: 'http://test-api.corp.com',
      userId: '1024',
      token: 'eyJhbGciOiJIUzI1NiIs...',
      paymentId: 'pay_001',
    },
  },
  {
    id: 'env-prod',
    name: '生产环境 prod',
    variables: {
      base_url: 'https://api.corp.com',
      userId: '1024',
      token: '',
      paymentId: 'pay_001',
    },
  },
];

// ---- Initial State ----

function createInitialState(): AppState {
  const saved = loadData<Partial<AppState>>('app_state', {});

  return {
    activePage: saved.activePage || 'workspace',
    groups: saved.groups || defaultGroups,
    activeEndpointId: saved.activeEndpointId || 'api-get-user',
    environments: saved.environments || defaultEnvironments,
    activeEnvironmentId: saved.activeEnvironmentId || 'env-dev',
    request: saved.request || {
      method: 'GET',
      url: '{{base_url}}/api/v1/users/{{userId}}',
      params: [
        { id: 'p1', name: 'userId', value: '{{userId}}', description: '用户ID', enabled: true },
        { id: 'p2', name: 'include', value: 'profile,roles', description: '附加字段', enabled: true },
      ],
      headers: [
        { id: 'h1', key: 'Content-Type', value: 'application/json', description: '数据格式', enabled: true },
        { id: 'h2', key: 'Authorization', value: 'Bearer {{token}}', description: '访问令牌', enabled: true },
      ],
      auth: { type: 'bearer', bearerToken: '{{token}}' },
      body: '',
      bodyType: 'none',
      preScript: '// 设置变量\npm.variables.set("timestamp", new Date().toISOString());',
      testScript: '// 状态码测试\npm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});',
    },
    response: saved.response || {
      body: JSON.stringify({
        code: 200,
        message: 'success',
        data: {
          id: 1024,
          name: '张三',
          email: 'zhangsan@corp.com',
          roles: ['admin'],
          createdAt: '2025-03-15',
        },
      }, null, 2),
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      responseTime: 127,
      timestamp: Date.now(),
    },
    requestHistory: saved.requestHistory || [],
    isRequesting: false,
    exportConfig: saved.exportConfig || {
      formats: ['pdf', 'doc'],
      includeParams: true,
      includeResponse: true,
      includeErrors: true,
      includeChangelog: false,
      mergeDoc: true,
      selectedEndpoints: ['api-get-user', 'api-create-user', 'api-update-user', 'api-delete-user', 'api-create-order', 'api-list-orders'],
      selectedGroups: ['group-users', 'group-orders'],
    },
    exportContent: saved.exportContent || '',
    searchQuery: '',
  };
}

// ---- Actions ----

type Action =
  | { type: 'SET_PAGE'; payload: 'workspace' | 'export' }
  | { type: 'SELECT_ENDPOINT'; payload: string }
  | { type: 'SET_REQUEST'; payload: Partial<AppState['request']> }
  | { type: 'SET_RESPONSE'; payload: ApiResponse | null }
  | { type: 'SET_REQUESTING'; payload: boolean }
  | { type: 'TOGGLE_GROUP'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_ENVIRONMENT'; payload: string }
  | { type: 'ADD_PARAM' }
  | { type: 'UPDATE_PARAM'; payload: { id: string; field: string; value: string | boolean } }
  | { type: 'REMOVE_PARAM'; payload: string }
  | { type: 'ADD_HEADER' }
  | { type: 'UPDATE_HEADER'; payload: { id: string; field: string; value: string | boolean } }
  | { type: 'REMOVE_HEADER'; payload: string }
  | { type: 'SET_AUTH'; payload: AuthConfig }
  | { type: 'SET_BODY'; payload: string }
  | { type: 'SET_PRE_SCRIPT'; payload: string }
  | { type: 'SET_TEST_SCRIPT'; payload: string }
  | { type: 'TOGGLE_FORMAT'; payload: ExportFormat }
  | { type: 'TOGGLE_EXPORT_OPTION'; payload: keyof AppState['exportConfig'] }
  | { type: 'TOGGLE_EXPORT_ENDPOINT'; payload: { endpointId: string; groupId: string } }
  | { type: 'TOGGLE_EXPORT_GROUP'; payload: string }
  | { type: 'SELECT_ALL_EXPORT' }
  | { type: 'DESELECT_ALL_EXPORT' }
  | { type: 'SET_BODY_TYPE'; payload: 'json' | 'form' | 'raw' | 'none' }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> }
  // ---- 分组 & 接口 增删 ----
  | { type: 'ADD_GROUP' }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'RENAME_GROUP'; payload: { id: string; name: string } }
  | { type: 'ADD_ENDPOINT'; payload: string }        // groupId
  | { type: 'DELETE_ENDPOINT'; payload: { groupId: string; endpointId: string } }
  | { type: 'RENAME_ENDPOINT'; payload: { endpointId: string; name: string } }
  | { type: 'SAVE_ENDPOINT' }
  | { type: 'GENERATE_RESPONSE_PARAMS' }
  | { type: 'UPDATE_RESPONSE_PARAM'; payload: { paramId: string; field: string; value: string | boolean } }
  | { type: 'SET_EXPORT_CONTENT'; payload: string };

// ---- Reducer ----

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, activePage: action.payload };

    case 'SELECT_ENDPOINT': {
      const endpoint = state.groups
        .flatMap(g => g.endpoints)
        .find(e => e.id === action.payload);
      if (!endpoint) return state;
      return {
        ...state,
        activeEndpointId: action.payload,
        request: {
          method: endpoint.method,
          url: endpoint.url,
          params: endpoint.params.map(p => ({ ...p })),
          headers: endpoint.headers.map(h => ({ ...h })),
          auth: { ...endpoint.auth },
          body: endpoint.body,
          bodyType: endpoint.bodyType,
          preScript: endpoint.preScript,
          testScript: endpoint.testScript,
        },
      };
    }

    case 'SET_REQUEST':
      return { ...state, request: { ...state.request, ...action.payload } };

    case 'SET_RESPONSE':
      return { ...state, response: action.payload };

    case 'SET_REQUESTING':
      return { ...state, isRequesting: action.payload };

    case 'TOGGLE_GROUP':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.payload ? { ...g, collapsed: !g.collapsed } : g
        ),
      };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };

    case 'SET_ENVIRONMENT':
      return { ...state, activeEnvironmentId: action.payload };

    case 'ADD_PARAM':
      return {
        ...state,
        request: {
          ...state.request,
          params: [...state.request.params, { id: generateId(), name: '', value: '', description: '', enabled: true }],
        },
      };

    case 'UPDATE_PARAM': {
      const params = state.request.params.map(p =>
        p.id === action.payload.id
          ? { ...p, [action.payload.field]: action.payload.value }
          : p
      );
      return { ...state, request: { ...state.request, params } };
    }

    case 'REMOVE_PARAM':
      return {
        ...state,
        request: { ...state.request, params: state.request.params.filter(p => p.id !== action.payload) },
      };

    case 'ADD_HEADER':
      return {
        ...state,
        request: {
          ...state.request,
          headers: [...state.request.headers, { id: generateId(), key: '', value: '', description: '', enabled: true }],
        },
      };

    case 'UPDATE_HEADER': {
      const headers = state.request.headers.map(h =>
        h.id === action.payload.id
          ? { ...h, [action.payload.field]: action.payload.value }
          : h
      );
      return { ...state, request: { ...state.request, headers } };
    }

    case 'REMOVE_HEADER':
      return {
        ...state,
        request: { ...state.request, headers: state.request.headers.filter(h => h.id !== action.payload) },
      };

    case 'SET_AUTH':
      return { ...state, request: { ...state.request, auth: action.payload } };

    case 'SET_BODY':
      return { ...state, request: { ...state.request, body: action.payload } };

    case 'SET_PRE_SCRIPT':
      return { ...state, request: { ...state.request, preScript: action.payload } };

    case 'SET_TEST_SCRIPT':
      return { ...state, request: { ...state.request, testScript: action.payload } };

    case 'SET_BODY_TYPE':
      return { ...state, request: { ...state.request, bodyType: action.payload } };

    case 'TOGGLE_FORMAT': {
      const formats = state.exportConfig.formats.includes(action.payload)
        ? state.exportConfig.formats.filter(f => f !== action.payload)
        : [...state.exportConfig.formats, action.payload];
      return { ...state, exportConfig: { ...state.exportConfig, formats } };
    }

    case 'TOGGLE_EXPORT_OPTION':
      return {
        ...state,
        exportConfig: { ...state.exportConfig, [action.payload]: !state.exportConfig[action.payload] },
      };

    case 'TOGGLE_EXPORT_ENDPOINT': {
      const eid = action.payload.endpointId;
      const gid = action.payload.groupId;
      const hasEndpoint = state.exportConfig.selectedEndpoints.includes(eid);
      let selectedEndpoints = hasEndpoint
        ? state.exportConfig.selectedEndpoints.filter(id => id !== eid)
        : [...state.exportConfig.selectedEndpoints, eid];

      // If all endpoints in group deselected, remove group
      const group = state.groups.find(g => g.id === gid);
      let selectedGroups = state.exportConfig.selectedGroups;
      if (group) {
        const allGroupSelected = group.endpoints.every(e => selectedEndpoints.includes(e.id));
        if (allGroupSelected && !selectedGroups.includes(gid)) {
          selectedGroups = [...selectedGroups, gid];
        } else if (!allGroupSelected && selectedGroups.includes(gid)) {
          selectedGroups = selectedGroups.filter(id => id !== gid);
        }
      }

      return { ...state, exportConfig: { ...state.exportConfig, selectedEndpoints, selectedGroups } };
    }

    case 'TOGGLE_EXPORT_GROUP': {
      const gid = action.payload;
      const hasGroup = state.exportConfig.selectedGroups.includes(gid);
      const group = state.groups.find(g => g.id === gid);
      let selectedGroups: string[];
      let selectedEndpoints = state.exportConfig.selectedEndpoints;

      if (hasGroup) {
        selectedGroups = state.exportConfig.selectedGroups.filter(id => id !== gid);
        if (group) {
          selectedEndpoints = selectedEndpoints.filter(id => !group.endpoints.some(e => e.id === id));
        }
      } else {
        selectedGroups = [...state.exportConfig.selectedGroups, gid];
        if (group) {
          const newIds = group.endpoints.map(e => e.id).filter(id => !selectedEndpoints.includes(id));
          selectedEndpoints = [...selectedEndpoints, ...newIds];
        }
      }

      return { ...state, exportConfig: { ...state.exportConfig, selectedGroups, selectedEndpoints } };
    }

    case 'SELECT_ALL_EXPORT': {
      const allEndpoints = state.groups.flatMap(g => g.endpoints.map(e => e.id));
      const allGroups = state.groups.map(g => g.id);
      return {
        ...state,
        exportConfig: { ...state.exportConfig, selectedEndpoints: allEndpoints, selectedGroups: allGroups },
      };
    }

    case 'DESELECT_ALL_EXPORT':
      return {
        ...state,
        exportConfig: { ...state.exportConfig, selectedEndpoints: [], selectedGroups: [] },
      };

    case 'LOAD_STATE':
      return { ...state, ...action.payload };

    // ---- 分组操作 ----
    case 'ADD_GROUP': {
      const colors = ['#1E40AF', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];
      const newGroup: ApiGroup = {
        id: generateId(),
        name: '新建分组',
        icon: 'N',
        iconColor: colors[state.groups.length % colors.length],
        collapsed: false,
        endpoints: [],
      };
      return { ...state, groups: [...state.groups, newGroup] };
    }

    case 'DELETE_GROUP': {
      const gid = action.payload;
      const newGroups = state.groups.filter(g => g.id !== gid);
      // 如果删掉的分组包含当前选中接口，切到第一个可用接口
      const deletedGroup = state.groups.find(g => g.id === gid);
      const deletedIds = deletedGroup?.endpoints.map(e => e.id) ?? [];
      const needSwitch = deletedIds.includes(state.activeEndpointId ?? '');
      const nextEp = newGroups[0]?.endpoints[0];
      return {
        ...state,
        groups: newGroups,
        activeEndpointId: needSwitch ? (nextEp?.id ?? null) : state.activeEndpointId,
        request: needSwitch && nextEp ? {
          method: nextEp.method,
          url: nextEp.url,
          params: nextEp.params.map(p => ({ ...p })),
          headers: nextEp.headers.map(h => ({ ...h })),
          auth: { ...nextEp.auth },
          body: nextEp.body,
          bodyType: nextEp.bodyType,
          preScript: nextEp.preScript,
          testScript: nextEp.testScript,
        } : state.request,
      };
    }

    case 'RENAME_GROUP': {
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.payload.id ? { ...g, name: action.payload.name } : g
        ),
      };
    }

    // ---- 接口操作 ----
    case 'ADD_ENDPOINT': {
      const gid = action.payload;
      const newEp: ApiEndpoint = {
        id: generateId(),
        name: '新建接口',
        method: 'GET',
        url: '',
        params: [],
        headers: [
          { id: generateId(), key: 'Content-Type', value: 'application/json', description: '', enabled: true },
        ],
        auth: { type: 'none' },
        body: '',
        bodyType: 'none',
        preScript: '',
        testScript: '',
        description: '',
        responseParams: [],
      };
      const newGroups = state.groups.map(g =>
        g.id === gid ? { ...g, collapsed: false, endpoints: [...g.endpoints, newEp] } : g
      );
      return {
        ...state,
        groups: newGroups,
        activeEndpointId: newEp.id,
        request: {
          method: newEp.method,
          url: newEp.url,
          params: [],
          headers: [...newEp.headers],
          auth: { type: 'none' },
          body: '',
          bodyType: 'none',
          preScript: '',
          testScript: '',
        },
      };
    }

    case 'DELETE_ENDPOINT': {
      const { groupId, endpointId } = action.payload;
      const newGroups = state.groups.map(g =>
        g.id === groupId ? { ...g, endpoints: g.endpoints.filter(e => e.id !== endpointId) } : g
      );
      const needSwitch = state.activeEndpointId === endpointId;
      const allEps = newGroups.flatMap(g => g.endpoints);
      const nextEp = allEps[0];
      return {
        ...state,
        groups: newGroups,
        activeEndpointId: needSwitch ? (nextEp?.id ?? null) : state.activeEndpointId,
        request: needSwitch && nextEp ? {
          method: nextEp.method,
          url: nextEp.url,
          params: nextEp.params.map(p => ({ ...p })),
          headers: nextEp.headers.map(h => ({ ...h })),
          auth: { ...nextEp.auth },
          body: nextEp.body,
          bodyType: nextEp.bodyType,
          preScript: nextEp.preScript,
          testScript: nextEp.testScript,
        } : state.request,
      };
    }

    case 'RENAME_ENDPOINT': {
      const { endpointId, name } = action.payload;
      // Also update sidebar display name in groups
      const newGroups = state.groups.map(g => ({
        ...g,
        endpoints: g.endpoints.map(e => e.id === endpointId ? { ...e, name } : e),
      }));
      return { ...state, groups: newGroups };
    }

    case 'SAVE_ENDPOINT': {
      const { activeEndpointId, request, groups } = state;
      if (!activeEndpointId) return state;
      const newGroups = groups.map(g => ({
        ...g,
        endpoints: g.endpoints.map(e =>
          e.id === activeEndpointId
            ? {
                ...e,
                method: request.method,
                url: request.url,
                params: request.params.map(p => ({ ...p })),
                headers: request.headers.map(h => ({ ...h })),
                auth: { ...request.auth },
                body: request.body,
                bodyType: request.bodyType,
                preScript: request.preScript,
                testScript: request.testScript,
              }
            : e
        ),
      }));
      return { ...state, groups: newGroups };
    }

    case 'GENERATE_RESPONSE_PARAMS': {
      const { activeEndpointId, response, groups } = state;
      if (!activeEndpointId || !response) return state;
      let parsed: unknown;
      try { parsed = JSON.parse(response.body); } catch { return state; }
      const params = parseJsonToParams(parsed);
      const newGroups = groups.map(g => ({
        ...g,
        endpoints: g.endpoints.map(e =>
          e.id === activeEndpointId ? { ...e, responseParams: params } : e
        ),
      }));
      return { ...state, groups: newGroups };
    }

    case 'UPDATE_RESPONSE_PARAM': {
      const { activeEndpointId, groups } = state;
      if (!activeEndpointId) return state;
      const updateParam = (list: ResponseParam[]): ResponseParam[] =>
        list.map(p => {
          if (p.id === action.payload.paramId) {
            return { ...p, [action.payload.field]: action.payload.value };
          }
          if (p.children) {
            return { ...p, children: updateParam(p.children) };
          }
          return p;
        });
      const newGroups = groups.map(g => ({
        ...g,
        endpoints: g.endpoints.map(e =>
          e.id === activeEndpointId ? { ...e, responseParams: updateParam(e.responseParams) } : e
        ),
      }));
      return { ...state, groups: newGroups };
    }

    case 'SET_EXPORT_CONTENT':
      return { ...state, exportContent: action.payload };

    default:
      return state;
  }
}

// ---- Context ----

interface ApiContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  getEnv: () => Environment | undefined;
  resolveVars: (text: string) => string;
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);

  const getEnv = useCallback(() => {
    return state.environments.find(e => e.id === state.activeEnvironmentId);
  }, [state.environments, state.activeEnvironmentId]);

  const resolveVars = useCallback((text: string): string => {
    const env = getEnv();
    if (!env) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return env.variables[key] ?? `{{${key}}}`;
    });
  }, [getEnv]);

  // Persist state
  useEffect(() => {
    const toSave: Partial<AppState> = {
      activePage: state.activePage,
      groups: state.groups,
      activeEndpointId: state.activeEndpointId,
      environments: state.environments,
      activeEnvironmentId: state.activeEnvironmentId,
      request: state.request,
      response: state.response ?? undefined,
      requestHistory: state.requestHistory,
      exportConfig: state.exportConfig,
      exportContent: state.exportContent,
    };
    saveData('app_state', toSave);
  }, [state]);

  return (
    <ApiContext.Provider value={{ state, dispatch, getEnv, resolveVars }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
}
