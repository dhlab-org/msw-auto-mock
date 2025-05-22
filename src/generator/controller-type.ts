interface IControllerType {
  generate(targetFolder: string): Promise<void>;
}

class ControllerType implements IControllerType {
  constructor() {}

  async generate(targetFolder: string): Promise<void> {}
}

export { ControllerType };
