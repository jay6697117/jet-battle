import zh from './zh.js';
import en from './en.js';

/**
 * 轻量级国际化管理器
 * 支持中英文切换，语言偏好保存到 localStorage
 */
class I18nManager {
  constructor() {
    this._locales = { zh, en };
    this._locale = 'zh'; // 默认中文
    this._listeners = [];

    // 从 localStorage 恢复语言偏好
    try {
      const saved = localStorage.getItem('jet-battle-lang');
      if (saved && this._locales[saved]) {
        this._locale = saved;
      }
    } catch (e) { /* 静默失败 */ }
  }

  /**
   * 获取当前语言
   */
  getLocale() {
    return this._locale;
  }

  /**
   * 切换语言
   * @param {string} locale - 'zh' 或 'en'
   */
  setLocale(locale) {
    if (!this._locales[locale]) return;
    this._locale = locale;

    // 保存到 localStorage
    try {
      localStorage.setItem('jet-battle-lang', locale);
    } catch (e) { /* 静默失败 */ }

    // 刷新所有带 data-i18n 属性的 DOM 元素
    this._refreshDOM();

    // 更新页面标题和 meta
    document.title = this.t('page_title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', this.t('page_desc'));

    // 触发监听器
    for (const fn of this._listeners) {
      fn(locale);
    }
  }

  /**
   * 中英切换
   */
  toggleLocale() {
    this.setLocale(this._locale === 'zh' ? 'en' : 'zh');
  }

  /**
   * 获取翻译文本
   * @param {string} key - 翻译键名
   * @param {Array} params - 占位符参数，替换 {0}, {1}...
   * @returns {string}
   */
  t(key, params) {
    let text = this._locales[this._locale]?.[key] ?? key;
    if (params) {
      for (let i = 0; i < params.length; i++) {
        text = text.replace(`{${i}}`, params[i]);
      }
    }
    return text;
  }

  /**
   * 注册语言变更监听
   * @param {Function} fn
   */
  onChange(fn) {
    this._listeners.push(fn);
  }

  /**
   * 刷新所有带 data-i18n 属性的 DOM 元素
   */
  _refreshDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    for (const el of elements) {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        // 属性翻译（如 title, placeholder）
        el.setAttribute(attr, this.t(key));
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = this.t(key);
      } else {
        el.textContent = this.t(key);
      }
    }
  }

  /**
   * 初始化：首次刷新 DOM + 设置页面标题
   */
  init() {
    this._refreshDOM();
    document.title = this.t('page_title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', this.t('page_desc'));
  }
}

// 全局单例
const i18n = new I18nManager();
export default i18n;
