import { describe, it, expect } from 'vitest';

describe('Sample Test', () => {
  it('基本的な算術演算が正しく動作する', () => {
    expect(1 + 1).toBe(2);
  });

  it('文字列の結合が正しく動作する', () => {
    const result = 'Hello' + ' ' + 'World';
    expect(result).toBe('Hello World');
  });

  it('配列の操作が正しく動作する', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });

  it('オブジェクトの比較が正しく動作する', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toEqual({ name: 'test', value: 42 });
  });

  it('非同期処理が正しく動作する', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });
});
