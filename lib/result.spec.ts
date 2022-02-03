import { Result } from "./result";
import { HttpError } from "./http-error";
import { IErrorDetail } from "./models";
describe("result", () => {
  it("It should correctly create an OK result", () => {
    expect(Result.ok(100)).toEqual({
      success: true,
      statusCode: 100,
    });
  });

  it("It should correctly create an OK result with a body", () => {
    expect(Result.ok(100, "")).toEqual({
      success: true,
      statusCode: 100,
      body: "",
    });
  });

  it("It should correctly create an OK result with custom headers", () => {
    expect(Result.ok(100, "", { foo: "bar" })).toEqual({
      success: true,
      statusCode: 100,
      body: "",
      headers: { foo: "bar" },
    });
  });

  it("It should correctly create an Error result", () => {
    expect(Result.error(100)).toEqual(new HttpError(100));
  });

  it("It should correctly create an Error result with a message", () => {
    expect(Result.error(101, "message")).toEqual(new HttpError(101, "message"));
  });

  it("It should correctly create an Error result with details", () => {
    const detail: IErrorDetail = {
      message: "message",
      code: 0,
      name: "name",
    };

    expect(Result.error(102, "message", detail, detail)).toEqual(
      new HttpError(102, "message", detail, detail)
    );
  });
});
