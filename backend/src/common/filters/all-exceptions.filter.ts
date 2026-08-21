import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        message = (res as any).message ?? exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002":
          status = HttpStatus.CONFLICT;
          message = `Duplicate value for unique field(s): ${(exception.meta as any)?.target ?? "unknown"}`;
          break;
        case "P2025":
          status = HttpStatus.NOT_FOUND;
          message = "Record not found";
          break;
        case "P2003":
          status = HttpStatus.CONFLICT;
          message = "Related record does not exist";
          break;
        case "P2014":
          status = HttpStatus.BAD_REQUEST;
          message = "Invalid relation";
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Database error (${exception.code})`;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${typeof exception === "object" && exception instanceof Error ? exception.stack : exception}`
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
