// 球种特性钩子。v1 只用 none；gravity 为「重力球」预留。
//
// 警告：任何改变 gravity 或 bounceSpeed 的球种，都会改变弹跳高度与弹跳周期，
// 从而让 docs/工程提示词.md 的 9 关限时表全部失效。
// 启用前必须先重跑 tools/balance-calc.mjs 重新校准。

export const TRAITS = {
  none: {
    code: 'none',
    onHit: null,
  },
  gravity: {
    code: 'gravity',
    onHit: (ball) => {
      ball.gravityMul *= 1.06;
    },
  },
};
