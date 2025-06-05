// src/utils/domUtils.js

/**
 * 异步查找DOM中的元素，支持多个选择器和MutationObserver。
 * @async
 * @param {string|string[]} selectors - 单个CSS选择器字符串或CSS选择器字符串数组。
 * 如果提供数组，将按顺序尝试直到找到元素。
 * @param {Node} [baseElement=document] - 在此基础元素内搜索。默认为整个文档。
 * @param {number} [timeout=7000] - 等待元素出现的超时时间（毫秒）。
 * @returns {Promise<Element|null>} 返回一个Promise，解析为找到的DOM元素，如果在超时内未找到则解析为null。
 */
export async function findElementAdvanced(selectors, baseElement = document, timeout = 7000) {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  for (const selector of selectorArray) {
    try {
      const element = baseElement.querySelector(selector);
      if (element) {
        // console.debug(`XSE DEBUG: Element found directly with selector: "${selector}"`, element);
        return element;
      }
    } catch (e) {
      console.warn(`XSE: Invalid selector "${selector}" during direct find:`, e);
    }
  }
  // console.debug(`XSE DEBUG: Element not found directly with selectors:`, selectorArray, `. Starting MutationObserver.`);

  return new Promise((resolve) => {
    let observer;
    const timer = setTimeout(() => {
      if (observer) {
        observer.disconnect();
        // console.debug(`XSE DEBUG: MutationObserver timed out for selectors:`, selectorArray);
      }
      resolve(null);
    }, timeout);

    observer = new MutationObserver((mutationsList, obs) => {
      for (const selector of selectorArray) {
        try {
          const element = baseElement.querySelector(selector);
          if (element) {
            clearTimeout(timer);
            obs.disconnect();
            // console.debug(`XSE DEBUG: Element found by MutationObserver with selector: "${selector}"`, element);
            resolve(element);
            return;
          }
        } catch (e) {
          // console.warn(`XSE: Invalid selector "${selector}" in MutationObserver:`, e);
        }
      }
    });

    // 确保 baseElement 存在并且是 Node 类型才进行 observe
    if (baseElement && typeof baseElement.observe === 'function') {
      // 检查 observe 方法是否存在不太准确，应检查节点类型
      observer.observe(baseElement === document ? document.documentElement : baseElement, {
        childList: true,
        subtree: true,
      });
    } else if (baseElement instanceof Node) {
      // 更准确的检查
      observer.observe(baseElement === document ? document.documentElement : baseElement, {
        childList: true,
        subtree: true,
      });
    } else {
      console.warn(
        'XSE: baseElement for MutationObserver is not a valid Node or document.documentElement. Selectors:',
        selectorArray,
        'BaseElement:',
        baseElement
      );
      clearTimeout(timer);
      resolve(null);
    }
  });
}
