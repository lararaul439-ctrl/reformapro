/** Error de regla de negocio: el mensaje (en español) es apto para mostrarse a la persona usuaria. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
