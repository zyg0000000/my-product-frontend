/**
 * constants.js - 常量定义模块
 * 包含 API 配置、预设维度、localStorage 键名等常量
 */

// --- API Configuration ---
export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';
export const TALENT_SEARCH_ENDPOINT = '/talents/search';
export const TALENT_FILTER_OPTIONS_ENDPOINT = '/talents/filter-options';
export const TALENT_BULK_UPDATE_ENDPOINT = '/talents/bulk-update';
export const FEISHU_SYNC_ENDPOINT = '/sync-from-feishu';

// --- localStorage Keys ---
export const ITEMS_PER_PAGE_KEY = 'performanceItemsPerPage';
export const DIMENSIONS_CONFIG_KEY = 'performanceDimensionsConfig';

// --- Preset Dimensions Configuration ---
export const PRESET_DIMENSIONS = [
    // 基础信息
    { id: 'nickname', name: '达人昵称', type: 'text', required: true, visible: true, sortable: true, category: '基础信息' },
    { id: 'xingtuId', name: '达人星图ID', type: 'text', required: false, visible: false, sortable: false, category: '基础信息' },
    { id: 'uid', name: '达人UID', type: 'text', required: false, visible: false, sortable: false, category: '基础信息' },
    { id: 'talentTier', name: '达人层级', type: 'text', required: false, visible: true, sortable: true, category: '基础信息' },
    { id: 'talentType', name: '达人类型', type: 'text', required: false, visible: true, sortable: true, category: '基础信息' },

    // 核心绩效
    { id: 'cpm60s', name: '60s+预期CPM', type: 'number', visible: true, sortable: true, category: '核心绩效' },
    { id: 'lastUpdated', name: '更新日期', type: 'date', visible: true, sortable: true, category: '核心绩效' },

    // 核心受众
    { id: 'maleAudienceRatio', name: '男性观众比例', type: 'percentage', visible: true, sortable: true, category: '核心受众' },
    { id: 'femaleAudienceRatio', name: '女性观众比例', type: 'percentage', visible: true, sortable: true, category: '核心受众' },
    { id: 'audience_18_40_ratio', name: '18-40岁观众占比', type: 'percentage', visible: true, sortable: true, category: '核心受众' },
    { id: 'audience_40_plus_ratio', name: '40岁以上观众占比', type: 'percentage', visible: true, sortable: true, category: '核心受众' },

    // 年龄段粉丝比例
    { id: 'ratio_18_23', name: '18-23岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
    { id: 'ratio_24_30', name: '24-30岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
    { id: 'ratio_31_40', name: '31-40岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
    { id: 'ratio_41_50', name: '41-50岁', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },
    { id: 'ratio_50_plus', name: '50岁以上', type: 'percentage', visible: false, sortable: true, category: '年龄段粉丝比例' },

    // 人群包粉丝比例
    { id: 'ratio_town_middle_aged', name: '小镇中老年', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
    { id: 'ratio_senior_middle_class', name: '资深中产', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
    { id: 'ratio_z_era', name: 'Z世代', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
    { id: 'ratio_urban_silver', name: '都市银发', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
    { id: 'ratio_town_youth', name: '小镇青年', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
    { id: 'ratio_exquisite_mom', name: '精致妈妈', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
    { id: 'ratio_new_white_collar', name: '新锐白领', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
    { id: 'ratio_urban_blue_collar', name: '都市蓝领', type: 'percentage', visible: false, sortable: true, category: '人群包粉丝比例' },
];

// --- Excel Column Mapping ---
export const COLUMN_MAP = {
    // 基础信息映射
    '达人昵称': { key: 'nickname', type: 'top' },
    '达人星图ID': { key: 'xingtuId', type: 'top' },
    '达人UID': { key: 'uid', type: 'top' },
    '达人层级': { key: 'talentTier', type: 'top' },
    '达人类型': { key: 'talentType', type: 'top' },

    // 核心绩效映射
    '60s+预期CPM': { key: 'cpm60s', type: 'performance', format: 'number' },
    '更新日期': { key: 'lastUpdated', type: 'performance' },

    // 受众比例映射
    '男性观众比例': { key: 'maleAudienceRatio', type: 'performance', format: 'percentage' },
    '女性观众比例': { key: 'femaleAudienceRatio', type: 'performance', format: 'percentage' },
    '18-40岁观众占比': { key: 'audience_18_40_ratio', type: 'performance', format: 'percentage' },
    '40岁以上观众占比': { key: 'audience_40_plus_ratio', type: 'performance', format: 'percentage' },

    // 年龄段映射
    '18-23岁': { key: 'ratio_18_23', type: 'performance', format: 'percentage' },
    '24-30岁': { key: 'ratio_24_30', type: 'performance', format: 'percentage' },
    '31-40岁': { key: 'ratio_31_40', type: 'performance', format: 'percentage' },
    '41-50岁': { key: 'ratio_41_50', type: 'performance', format: 'percentage' },
    '50岁以上': { key: 'ratio_50_plus', type: 'performance', format: 'percentage' },

    // 人群包映射
    '小镇中老年': { key: 'ratio_town_middle_aged', type: 'performance', format: 'percentage' },
    '资深中产': { key: 'ratio_senior_middle_class', type: 'performance', format: 'percentage' },
    'Z世代': { key: 'ratio_z_era', type: 'performance', format: 'percentage' },
    '都市银发': { key: 'ratio_urban_silver', type: 'performance', format: 'percentage' },
    '小镇青年': { key: 'ratio_town_youth', type: 'performance', format: 'percentage' },
    '精致妈妈': { key: 'ratio_exquisite_mom', type: 'performance', format: 'percentage' },
    '新锐白领': { key: 'ratio_new_white_collar', type: 'performance', format: 'percentage' },
    '都市蓝领': { key: 'ratio_urban_blue_collar', type: 'performance', format: 'percentage' }
};