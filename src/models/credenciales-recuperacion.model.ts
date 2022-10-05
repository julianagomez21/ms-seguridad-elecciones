import {Model, model, property} from '@loopback/repository';

@model()
export class CredencialesRecuperacion extends Model {
  @property({
    type: 'string',
    required: true,
  })
  correo: string;


  constructor(data?: Partial<CredencialesRecuperacion>) {
    super(data);
  }
}

export interface CredencialesRecuperacionRelations {
  // describe navigational properties here
}

export type CredencialesRecuperacionWithRelations = CredencialesRecuperacion & CredencialesRecuperacionRelations;
