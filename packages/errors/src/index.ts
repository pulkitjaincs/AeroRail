export abstract class CustomError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  abstract serializeErrors(): { message: string; field?: string }[];
}

export class BadRequestError extends CustomError {
  readonly statusCode = 400;

  constructor(public message: string, public field?: string) {
    super(message);
  }

  serializeErrors() {
    return [{ message: this.message, field: this.field }];
  }
}

export class UnauthorizedError extends CustomError {
  readonly statusCode = 401;

  constructor(public message: string = 'Not authorized') {
    super(message);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

export class ForbiddenError extends CustomError {
  readonly statusCode = 403;

  constructor(public message: string = 'Forbidden') {
    super(message);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

export class NotFoundError extends CustomError {
  readonly statusCode = 404;

  constructor(public message: string = 'Resource not found') {
    super(message);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

export class ConflictError extends CustomError {
  readonly statusCode = 409;

  constructor(public message: string) {
    super(message);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}

export class InternalServerError extends CustomError {
  readonly statusCode = 500;

  constructor(public message: string = 'Something went wrong') {
    super(message);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
