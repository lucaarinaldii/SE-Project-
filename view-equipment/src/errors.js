class ContractError extends Error {
  constructor(code) {
    super(code);
    this.name = "ContractError";
    this.code = code;
  }
}

module.exports = { ContractError };
