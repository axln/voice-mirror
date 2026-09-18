export class CircularBuffer {
  private _buffer: Float32Array;
  private _head = 0;
  private _size = 0;

  constructor(length: number) {
    this._buffer = new Float32Array(length);
  }

  push(value: number): void {
    this._buffer[this._head++] = value;
    if (this._size < this._buffer.length) {
      this._size++;
    }

    if (this._head >= this._buffer.length) {
      this._head = 0;
    }
  }

  // index 0 is the oldest value, index size-1 is the newest value
  get(index: number): number {
    if (index < 0 || index >= this._size) {
      throw new Error('Index out of bounds');
    }
    const i = (this._head + this._buffer.length - this._size + index) % this._buffer.length;
    return this._buffer[i];
  }

  get size(): number {
    return this._size;
  }

  get length(): number {
    return this._buffer.length;
  }

  // shrinking must keep the most recent values, growing must keep the most recent values and fill the rest with 0
  set length(newLength: number) {
    if (newLength < 0) {
      throw new Error('Length must be non-negative');
    }

    if (newLength === this._buffer.length) {
      return;
    }

    const newBuffer = new Float32Array(newLength);
    const itemsToCopy = Math.min(this._size, newLength);
    const startIndex = this._size - itemsToCopy;

    for (let i = 0; i < itemsToCopy; i++) {
      newBuffer[i] = this.get(startIndex + i);
    }

    this._buffer = newBuffer;
    this._size = itemsToCopy;
    this._head = this._size % newLength;
  }

  clear() {
    this._buffer.fill(0);
    this._head = 0;
    this._size = 0;
  }

  set(buffer: Float32Array) {
    this._buffer = buffer;
    this._head = 0;
    this._size = buffer.length;
  }
}
