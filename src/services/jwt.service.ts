import { /* inject, */ BindingScope, injectable} from '@loopback/core';
import {Keys} from '../config/keys';
let jwt = require('jsonwebtoken');

@injectable({scope: BindingScope.TRANSIENT})
export class JwtService {
  constructor(/* Add @inject to inject parameters */) { }

  /**
   * Se genera un token con la informacion en formato de JWT
   * @param info datos que quedaran en el token
   * @returns token firmado con la clave secreta
   */
  crearToken(info: object): string {
    try {

      //sign: firmando
      let token = jwt.sign(info, Keys.JwtSecretKey);
      return token;

    } catch (err) {
      throw err;
    }
  }

  /**
   * Se valida un token, si es correcto retorna el id del Rol del usuario
   * @param tk token a validar
   * @returns boolean con la respuesta
   */
  validarToken(tk: string): string {
    try {

      let info = jwt.verify(tk, Keys.JwtSecretKey);
      console.log(info.rol);
      return info.rol;

    } catch (err) {
      return "";
    }
  }



}
