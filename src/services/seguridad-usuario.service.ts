import { /* inject, */ BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {CredencialesLogin} from '../models';
import {UsuarioRepository} from '../repositories';
import {JwtService} from './jwt.service';
let generator = require('generate-password');
let MD5 = require('crypto-js/md5');

@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    private usuarioRepository: UsuarioRepository,
    @service(JwtService)
    private servicioJwt: JwtService
  ) { }

  /**
   * Metodo para la autenticacion de usuarios
   * @param credenciales credenciales de acceso
   * @returns cadena con el token cuando todo esta bien, o una cadena vacia cuando no coinciden las credenciales.
   */
  async identificarUsuario(credenciales: CredencialesLogin): Promise<string> {
    let respuesta = "";

    const usuario = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.nombreUsuario,
        clave: credenciales.clave
      }
    });

    if (usuario) {
      const datos = {
        nombre: `${usuario.nombres} ${usuario.apellidos}`,
        correo: usuario.correo,
        rol: usuario.rolId
      }

      try {
        respuesta = this.servicioJwt.crearToken(datos);
        console.log(respuesta);
      } catch (err) {
        throw err;
      }
    }

    return respuesta;
  }

  /**
   * Genera una clave aleatoria
   * @returns clave generada
   */
  crearClaveAleatoria(): string {
    let password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true
    });

    console.log(password);
    return password;
  }

  /**
   * Cifra una cadena de texto con MD5
   * @param cadena la cadena que debe cifrarse
   * @returns cadena cifrada
   */
  cifrarCadena(cadena: string): string {
    let cadenaCifrada = MD5(cadena).toString();
    return cadenaCifrada;
  }
}
