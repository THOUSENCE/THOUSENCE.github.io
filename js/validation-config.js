// 验证系统参数配置
export const VALIDATION_CONFIG = {
  // IP检查配置
  IP_CHECK: true,
  IP_POLICY: {
    hashing: true,          // 是否哈希处理IP
    allowLocalhost: true    // 是否允许本地测试
  },

  // // 时间限制（单位：毫秒）
  // TIME_LIMITS: {
  //   total: 166000,         // 总时长限制
  //   sections: {
  //     part1: 6000,        // 第一部分
  //     scenario1: 20000,     // 情境题
  //     scenario2: 20000,    // 情境题
  //     scenario3: 20000,    // 情境题
  //     scenario4: 20000,     // 情境题
  //     scenario5: 20000,    // 情境题
  //     scenario6: 20000,     // 情境题
  //     scenario7: 20000,     // 情境题
  //     scenario8: 20000,     // 情境题
  //   }
  // },
    // 时间限制（单位：毫秒）
    TIME_LIMITS: {
      total: 1000,         // 总时长限制
      sections: {
        part1: 1000,        // 第一部分
        scenario1: 1000,     // 情境题
        scenario2: 1000,    // 情境题
        scenario3: 1000,    // 情境题
        scenario4: 1000,     // 情境题
        scenario5: 1000,    // 情境题
        scenario6: 1000,     // 情境题
        scenario7: 1000,     // 情境题
        scenario8: 1000,     // 情境题
      }
    },

  // 矛盾问题检测配置
  CONFLICT_QUESTIONS: {
    ai_usage: {
      questions: ['part1.ai_usage', 'part1.frequency'], // 支持嵌套路径
       // 预期合理答案组合
      expected: [
        ['yes', 'weekly1'],
        ['yes', 'monthly'],
        ['yes', 'daily'],
        ['yes', 'weekly3']
      ] 
    }
  },

  // 重复回答检测配置
  REPETITION_RULES: {
    threshold: 0.99,         // 重复率超过80%触发
    ignoreQuestions: ['gender', 'age'] // 忽略基础信息问题
  }
};