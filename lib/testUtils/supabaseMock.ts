export function createQueryBuilderMock<T>(result: { data: T; error: any }) {
  const builder: any = {};
  const chainMethods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order', 'limit', 'gt', 'not'];
  chainMethods.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}
