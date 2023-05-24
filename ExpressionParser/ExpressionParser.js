const ExpressionParser = (function() {
  // 操作符 + 优先级
  const opeators = {
    18: ['(', ')'],
    17: ['.', '[', ']'], // , '?.'
    14: ['!', '~'],
    13: ['**'],
    12: ['*', '/', '%'],
    11: ['+', '-'],
    10: ['<<', '>>', '>>>'],
    9: ['<', '<=', '>', '>='],
    8: ['==', '!=', '===', '!=='],
    7: ['&'],
    6: ['^'],
    5: ['|'],
    4: ['&&'],
    3: ['||'], // , '??'
    2: ['?', ':'],
    1: [',']
  };
  // 优先级map
  const precedence = [];
  // 打平所有操作符
  const opeatorsList = Object.keys(opeators).reverse().reduce((res, key) => {
    const start = res.length;
    opeators[key].map((opt, index) => {
      precedence.push(key);
      res.push(opt);
    });
    return res;
  }, []);
  // console.log(opeators, precedence, opeatorsList);
  // 类型判断
  const type = {
    isNumber: (val) => /^\d+(\.\d+)?$/.test(val),
    isBoolean: (val) => val.toLowerCase() === 'true' || val.toLowerCase() === 'false',
    isString: (val) => val === "''" || val === "\"\"" || /^'[^']+?'$/.test(val) || /^"[^"]+?"$/.test(val),
    isNull: (val) => val.toLowerCase() === 'null',
    isUndefined: (val) => val.toLowerCase() === 'undefined',
  }
  // 设置值类型
  function setValue(str) {
    let data = null;
    if (str && str.type) {
      return str;
    }
    if ((typeof str === 'string' && type.isNumber(str)) || typeof str === 'number') {
      data = {
        type: 'number',
        val: Number(str)
      }
    } else if (typeof str === 'boolean') {
      data = {
        type: 'boolean',
        val: str === true
      }
    } else if ((typeof str === 'string' && type.isBoolean(str))) {
      data = {
        type: 'boolean',
        val: str.toLowerCase() === 'true'
      }
    } else if (typeof str === 'string' && type.isString(str)) {
      data = {
        type: 'string',
        val: str.substring(1, str.length - 1)
      }
    } else if ((typeof str === 'string' && type.isNull(str)) || (str === null)) {
      data = {
        type: 'null',
        val: null
      }
    } else if ((typeof str === 'string' && type.isUndefined(str)) || typeof str === 'undefined') {
      data = {
        type: 'undefined',
        val: undefined
      }
    }
    return data;
  }
  // 构建方法入参
  function makeParams(list) {
    return list.reduce((res, itm, idx) => {
      if (idx === 0 || (itm.type === 'opeator' && itm.opeator === ',')) res.push([]);
      if ((itm.type === 'opeator' && itm.opeator === ',')) return res;
      res[res.length - 1].push(itm);
      return res;
    }, [])
  }
  // 将字符串按操作符分割
  function splitString(exp) {
    let result = [];
    result.push(exp);
    // 由于优先级原因，需要将 &，| 移至数组尾部，避免和 && || 冲突
    const _opeatorsList = [...opeatorsList];
    ['&', '|'].map((itm) => _opeatorsList.splice(_opeatorsList.indexOf(itm), 1));
    _opeatorsList.push('&');
    _opeatorsList.push('|');
    // debugger;
    _opeatorsList.map((opeator) => {
      const tm = [];
      result.map((str) => {
        if (opeatorsList.indexOf(str) > -1) {
          tm.push(str);
        } else {
          let index = str.indexOf(opeator);
          let start = 0;
          while(index > -1 && str.length > 0) {
            if (index > 0) {
              tm.push(str.substring(0, index)); // 操作符前字符串
            }
            tm.push(str.substring(index, index + opeator.length)); // 操作符
            str = str.substring(index + opeator.length); // 截取到操作符后
            index = str.indexOf(opeator); // 获取截取后字符串中的第一个操作符
          }
          if (str) tm.push(str);
        }
      });
      if (tm.length) result = [...tm];
    });
    return result;
  }
  // 识别 是数据还是操作符
  function identifyString(exp) {
    return exp.map((str, data) => {
      if (opeatorsList.indexOf(str) > -1) {
        data = {
          type: 'opeator',
          precedence: precedence[opeatorsList.indexOf(str)],
          opeator: str,
        }
      } else {
        data = setValue(str);
      }
      if (data === null) {
        data = {
          type: 'identifier',
          val: str
        }
      }
      return data;
    })
  }
  // 分组
  function grouping(exp, data, ext) {
    const result = [];
    for (let i = 0; i < exp.length; i++) {
      const ident = exp[i];
      // 是 (
      if (ident.type === 'opeator' && ident.opeator === '(') {
        const group = {type: 'group', child: null, precedence: ident.precedence};
        // 查找对应的 )
        let offset = 0; // (对应的 下标
        let nextIdent = exp[++i];
        let nestCount = 0;
        let find = false;
        const child = [];
        do {
          offset++;
          // 找对应的 ) 
          if (nestCount == 0 && nextIdent.type === 'opeator' && nextIdent.opeator === ')') {
            find = true;
            offset--;
            break;
          }
          // 中间存在其他 嵌套的 ()
          if (nextIdent.type === 'opeator' && (nextIdent.opeator === '(' || nextIdent.opeator === ')')) {
            nextIdent.opeator === '(' ? nestCount++ : nestCount--;
          }
          child.push(nextIdent);
          nextIdent = exp[++i];
        } while(nextIdent);
        if (!find) {
          throw new Error('未找到对应)');
        }
        group.child = grouping(child, data);
        if (ext && ext.parameter) {
          return {
            data: group,
            offset: offset
          }
        }
        result.push(group);
      } else if (ident.type === 'identifier') { // 是 identifier
        // debugger;
        let identifier = null;
        if (typeof data === 'undefined' || typeof data[ident.val] === 'undefined') {
          throw new Error(data + ' or ' + ident.val + ' is not defined.');
        }

        let secondIdent = exp[++i];
        let thirdIdent = exp[++i];
        let val = data[ident.val];
        if (secondIdent && secondIdent.type === 'opeator' && (secondIdent.opeator === '.' || secondIdent.opeator === '[')) { // . [ 取值
          // 如果第一次就是用 [] 取值，则需要偏移量后移一位，跳过 ] 运算符
          secondIdent.opeator === '[' && ++i;
          while(1) {
            if (!thirdIdent || thirdIdent.type !== 'identifier' && thirdIdent.type !== 'number' && thirdIdent.type !== 'string') {
              console.info('---无法从中取到', val, secondIdent, thirdIdent);
              throw new Error('无法从中取到');
            }
            val = val[thirdIdent.val];
            
            // 下一组运算
            secondIdent = exp[++i];
            thirdIdent = exp[++i];
            if (secondIdent && thirdIdent) {
              if (secondIdent.type !== 'opeator' || (secondIdent.type === 'opeator' && secondIdent.opeator !== '.' && secondIdent.opeator !== '[')) { // 如果不是操作符或者 是操作符单不是.[ 说明对象取值结束
                i = i - 2;
                break;
              }
              if (secondIdent.opeator === '[' && (exp[i+1].type !== 'opeator' || exp[i+1].opeator !== ']')) { // 如果是 [ 运算符
                throw new Error('表达式异常。[]取值没有对应的 ]；注[]取值中间暂不支持表达式');
              }
              // 如果是 [] 取值，则偏移量往后移一位，跳过 ] 运算符
              secondIdent.opeator === '[' && i++;
              if (typeof val !== 'object' || val === null || val === undefined) {
                console.info('---无法从null/undefined/非对象 取子节点', val, secondIdent, thirdIdent);
                throw new Error('无法从null/undefined/非对象 取子节点');
              }
            } else {
              if (secondIdent && !thirdIdent) { // 存在前一个，且已经到了结尾
                if (secondIdent.type === 'opeator') {
                  throw new Error('表达式异常. 不能以' + secondIdent.opeator + '结尾');
                } else {
                  val = val[secondIdent.val];
                  break;
                }
              } else {
                break; // 都不存在，已经到了结尾
              }
            }
          }

        } else if (secondIdent && secondIdent.type === 'opeator' && secondIdent.opeator === '(') { // 函数
          // throw new Error('暂不支持函数计算')
          if (typeof data[ident.val] !== 'function') throw new Error('function ' + ident.val +' is not defined!');
          let params = grouping(exp.slice(i - 1), data, {parameter: true});
          i+=params.offset;
          params = makeParams(params.data.child);
          val = {
            type: 'function',
            precedence: '18',
            fnName: ident.val,
            params: params
          }
        } else {
          i = i - 2;
        }
        identifier = setValue(val);
        if (identifier === null) {
          identifier = {type: typeof val, val: val};
        }
        result.push(identifier);
      } else {
        result.push(ident);
      }
    }
    return result;
  }
  // 表达式计算
  const expressionEvaluate = {
    '!': (operand) => {
      return !(operand.val);
    },
    '~': (operand) => {
      return ~(operand.val);
    },
    '**': (operand1, operand2) => { // right-to-left
      return operand1.val ** operand2.val;
    },
    '*': (operand1, operand2) => {
      return operand1.val * operand2.val;
    },
    '/': (operand1, operand2) => {
      return operand1.val / operand2.val;
    },
    '%': (operand1, operand2) => {
      return operand1.val % operand2.val;
    },
    '+': (operand1, operand2) => {
      return operand1.val + operand2.val;
    },
    '-': (operand1, operand2) => {
      return operand1.val - operand2.val;
    },
    '<<': (operand1, operand2) => {
      return operand1.val << operand2.val;
    },
    '>>': (operand1, operand2) => {
      return operand1.val >> operand2.val;
    },
    '>>>': (operand1, operand2) => {
      return operand1.val >>> operand2.val;
    },
    '<': (operand1, operand2) => {
      return operand1.val < operand2.val;
    },
    '<=': (operand1, operand2) => {
      return operand1.val <= operand2.val;
    },
    '>': (operand1, operand2) => {
      return operand1.val > operand2.val;
    },
    '>=': (operand1, operand2) => {
      return operand1.val >= operand2.val;
    },
    '==': (operand1, operand2) => {
      return operand1.val == operand2.val;
    },
    '!=': (operand1, operand2) => {
      return operand1.val != operand2.val;
    },
    '===': (operand1, operand2) => {
      return operand1.val === operand2.val;
    },
    '!==': (operand1, operand2) => {
      return operand1.val !== operand2.val;
    },
    '&': (operand1, operand2) => {
      return operand1.val & operand2.val;
    },
    '^': (operand1, operand2) => {
      return operand1.val ^ operand2.val;
    },
    '|': (operand1, operand2) => {
      return operand1.val | operand2.val;
    },
    '&&': (operand1, operand2) => {
      return operand1.val && operand2.val;
    },
    '||': (operand1, operand2) => {
      return operand1.val || operand2.val;
    },
    '?': (condition, operand1, operand2) => { // right-to-left  condition ? exp1 : exp2;
      return condition.val ? operand1.val: operand2.val;
    },
    ',': (operand1, operand2) => {
      return (operand1.val, operand2.val);
    }
  }
  // 执行计算
  function evaluate(exp, data) {
    // debugger;
    // 处理分组和函数
    exp = exp.map((item) => {
      let result = null;
      // 处理分组
      if (item.type === 'group') {
        result = evaluate(item.child, data);
      } else if (item.type === 'function') { // 处理函数
        const params = item.params.map((param) => {
          return evaluate(param, data).val;
        })
        result = data[item.fnName].apply(this, params);
      } else { // 异常
        return item;
      }
      // 将结果替换到表达式中
      let identifier = setValue(result);
      if (identifier === null) {
        identifier = {type: typeof result, val: result};
      }
      return identifier;
    })
    let len = exp.length;
    while(len > 1) {
      // 优先级排序
      const precedences = [];
      // 剥离出所有的优先级
      exp.map((itm) => itm.type === 'opeator' && itm.precedence != '18' && precedences.indexOf(itm.precedence) === -1 && precedences.push(Number(itm.precedence)));
      // 倒序
      precedences.sort((a, b) => b - a);
      const precedence = precedences[0];
      let opeatorIndex = -1, opeatorItem = null;
      for (let i = 0; i < exp.length; i++) {
        const item = exp[i];
        if (item.type === 'opeator' && Number(item.precedence) === precedence) {
          opeatorIndex = i;
          opeatorItem = item;
          if (precedence === 13) continue; // ** 需要找到最后一个，right-to-left
          break;
        }
      }

      if (opeatorIndex === -1 || opeatorItem === null) {
        throw new Error('没有找到优先级的' + precedence + '操作符');
      }
      const _eval = expressionEvaluate[opeatorItem.opeator];
      if (!_eval) {
        throw new Error('操作符' + opeatorItem.opeator + '不存在');
      }

      const operand1 = exp[opeatorIndex - 1], operand2 = exp[opeatorIndex + 1];
      let result = null, start = -1, count = 0;

      if (precedence === 14) { // 单运算数操作符，～，！
        if (!operand2 || operand2.type === 'opeator') {
          throw new Error('操作符' + opeatorItem.opeator + '需要一个right运算数');
        }
        if (opeatorItem.opeator !== '~' || opeatorItem.opeator !== '!') {
          throw new Error('操作符不属于单运算数操作符~,!;【' + opeatorItem.opeator + '】');
        }
        start = opeatorIndex;
        count = 2;
        result = _eval(operand2);
      } else if (precedence === 2) { // 三元运算符 ?:
        const colon = exp[opeatorIndex + 2], operand3 = exp[opeatorIndex + 3];
        if (!operand1 || operand1.type === 'opeator') {
          throw new Error('操作符' + opeatorItem.opeator + '需要一个运算数作为条件');
        }
        if (!operand2 || operand2.type === 'opeator') {
          throw new Error('操作符' + opeatorItem.opeator + '需要一个运算数作为truthy返回值');
        }
        if (!colon || colon.type !== 'opeator' || colon.opeator != ':') {
          throw new Error('操作符' + opeatorItem.opeator + '需要一个:操作符');
        }
        if (!operand3 || operand3.type === 'opeator') {
          throw new Error('操作符' + opeatorItem.opeator + '需要一个运算数作为falsy返回值');
        }
        start = opeatorIndex - 1;
        count = 5;
        result = _eval(operand1, operand2, operand3);
      } else {
        if (!operand1 || operand1.type === 'opeator') {
          throw new Error('操作符' + opeatorItem.opeator + '需要一个left运算数');
        }
        if (!operand2 || operand2.type === 'opeator') {
          throw new Error('操作符' + opeatorItem.opeator + '需要一个right运算数');
        }
        start = opeatorIndex - 1;
        count = 3;
        result = _eval(operand1, operand2);
      }
      const tmp = setValue(result)
      if (tmp === null) {
        result = {type: typeof result, val: result};
      } else {
        result = tmp;
      }
      if (start > -1 && count > 0 && result) {
        exp.splice(start, count, result);
      }
      if (exp.length == len) {
        throw new Error('????');
      }
      len = exp.length;
      // console.log('-----', exp.length);
    };
    // debugger;
    return exp[0];
  }
  return {
    parse: function(exp, data) {
      console.log(exp);
      exp = splitString(exp);
      console.log(exp);
      exp = identifyString(exp);
      console.log(exp);
      exp = grouping(exp, data);
      console.log(exp);
      exp = evaluate(exp, data);
      console.log(exp);
    }
  }
})();