// iOS Safari (including latest) does not implement
// ReadableStream.prototype[Symbol.asyncIterator]. pdf.js v5's getTextContent
// does `for await (const value of readableStream)` over a native ReadableStream,
// which throws "undefined is not a function (near 'i of e')" on Safari. This
// module installs the polyfill and must be imported before pdfjs-dist.

/* eslint-disable @typescript-eslint/no-explicit-any */
const proto = (typeof ReadableStream !== 'undefined' ? ReadableStream.prototype : undefined) as any
if (proto && !proto[Symbol.asyncIterator]) {
  proto[Symbol.asyncIterator] = function () {
    const reader = (this as ReadableStream).getReader()
    return {
      next: () => reader.read(),
      return: () => {
        reader.releaseLock()
        return Promise.resolve({ value: undefined, done: true })
      },
      [Symbol.asyncIterator]() { return this },
    }
  }
}

export {}
