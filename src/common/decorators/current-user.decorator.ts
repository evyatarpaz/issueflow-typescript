import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom parameter decorator for extracting the authenticated user.
 * Abstracts away the underlying HTTP Request object from the Controller handlers,
 * promoting cleaner dependency injection and easier unit testing.
 *
 * @param data - Optional string to extract a specific property (e.g., 'id') instead of the whole object.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
