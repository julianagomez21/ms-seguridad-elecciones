import { /* inject, */ BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import fetch from 'node-fetch';
import {Keys} from '../config/keys';
import {CredencialesLogin, CredencialesRecuperacion} from '../models';
import {UsuarioRepository, VerificacionCodigoRepository} from '../repositories';
import {JwtService} from './jwt.service';
let generator = require('generate-password');
let MD5 = require('crypto-js/md5');
const params = new URLSearchParams();
const paramsSMS = new URLSearchParams();

@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    private usuarioRepository: UsuarioRepository,
    @service(JwtService)
    private servicioJwt: JwtService,
    @repository(VerificacionCodigoRepository)
    private codigoRepository: VerificacionCodigoRepository
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
      try {
        let codigo = this.crearCodigoAleatorio();
        let mensaje = `¡Hola ${usuario.nombres}! <br /> Tu código de verificación es: ${codigo}`

        params.append('hash_validator', 'Admin12345@notificaciones.sender');
        params.append('destination', usuario.correo);
        params.append('subject', Keys.mensajeAsuntoVerificacion);
        params.append('message', mensaje);

        let r = "";

        console.log(params);
        console.log(Keys.urlEnviarCorreo);

        await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(async (res: any) => {
          r = await res.text();
        });

        mensaje = `¡Hola ${usuario.nombres}! Tu código de verificación es: ${codigo}`
        paramsSMS.append('hash_validator', 'Admin12345@notificaciones.sender');
        paramsSMS.append('message', mensaje);
        paramsSMS.append('destination', usuario.celular);

        await fetch(Keys.urlEnviarSMS, {method: 'POST', body: paramsSMS}).then(async (res: any) => {
          r = await res.text();
        });

        const codigoVerificacion = await this.codigoRepository.create({
          usuarioId: usuario.correo,
          codigo: codigo,
          estado: false
        });

        console.log(codigoVerificacion);
        respuesta = 'Código enviado.'

      } catch (err) {
        throw err;
      }
    } else {
      return "Las credenciales no coinciden."
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
   * Genera un codigo aleatorio
   * @returns codigo generado
   */
  crearCodigoAleatorio(): string {
    let codigo = generator.generate({
      length: 4,
      numbers: true,
    });

    console.log(codigo);
    return codigo;
  }

  /**
   * Cifra una cadena de texto en MD5
   * @param cadena la cadena que debe cifrarse
   * @returns cadena cifrada en MD5
   */
  cifrarCadena(cadena: string): string {
    let cadenaCifrada = MD5(cadena).toString();
    return cadenaCifrada;
  }

  /**
   * Se recupera una clave generandola aleatoriamente y enviandola por correo
   * @param credenciales credenciales del usuario a recuperar la clave
   */
  async recuperarClave(credenciales: CredencialesRecuperacion): Promise<boolean> {

    let usuario = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo
      }
    });

    if (usuario) {
      let nuevaClave = this.crearClaveAleatoria();
      let nuevaClaveCifrada = this.cifrarCadena(nuevaClave);
      usuario.clave = nuevaClaveCifrada;
      this.usuarioRepository.updateById(usuario._id, usuario);

      let mensaje = `Hola ${usuario.nombres} <br /> Su contraseña ha sido actualizada satisfactoriamente. La nueva contraseña es: ${nuevaClave}<br /> Si no ha sido usted o no logra acceder a la cuenta, comuníquese con +573136824950. <br /><br /> Equipo de soporte U de Caldas.`

      params.append('hash_validator', 'Admin12345@notificaciones.sender');
      params.append('destination', usuario.correo);
      params.append('subject', Keys.mensajeAsuntoRecuperacion);
      params.append('message', mensaje);

      let r = "";

      console.log(params);
      console.log(Keys.urlEnviarCorreo);


      await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(async (res: any) => {
        r = await res.text();
      })

      return r == "OK";

    } else {
      throw new HttpErrors[400]('El correo ingresado no está asociado a un usuario.');
    }
  }

  /**
   * Envio del correo con la contrasenia generada durante el proceso de registro
   * @param correo Correo del usuario creado que sera el nuevo destinatario
   * @param claveGenerada la clave generada al usuario para incluirla en el email de confirmacion de registro
   * @returns retorna si la accion se ejecuto o no
   */
  async correoPrimerContraseña(correo: string, claveGenerada: string): Promise<Boolean> {
    let usuario = await this.usuarioRepository.findOne({
      where: {
        correo: correo
      }
    });

    if (usuario) {

      let mensaje = `Hola ${usuario.nombres} <br /> Su usuario ha sido creado satisfactoriamente con el correo: ${correo} y contraseña: ${claveGenerada} <br /> Para modificar la contraseña ingrese al sistema. Si posee problemas para acceder a la cuenta comuníquese con +573136824950. <br /><br /> Equipo de soporte  U de Caldas.`

      params.append('hash_validator', 'Admin12345@notificaciones.sender');
      params.append('destination', correo);
      params.append('subject', Keys.mensajeAsuntoRegistro);
      params.append('message', mensaje);

      let r = "";

      await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(async (res: any) => {
        r = await res.text();
      })

      return r == "OK";

    } else {
      throw new HttpErrors[400]('Error con la confirmación de la creación del usuario.');
    }
  }

  /**
   * Funcion para validar el codigo de usuario
   * @param codigo tiene el codigo generado y el usuario al que pertenece
   * @returns un JWT si el codigo es valido, si no retorna una cadena vacia
   */
  async validarCodigo(codigo: string): Promise<string> {
    let respuesta = "";
    let verificar = await this.codigoRepository.findOne({
      where: {
        codigo: codigo
      }
    });

    if (verificar) {

      if (verificar.estado == false) {
        verificar.estado = true;
        this.codigoRepository.updateById(verificar._id, verificar);
        let usuario = await this.usuarioRepository.findOne({
          where: {
            correo: verificar.usuarioId
          }
        });

        if (usuario) {

          const datos = {
            nombre: `${usuario.nombres} ${usuario.apellidos}`,
            correo: usuario.correo,
            rol: usuario.rolId
          };

          try {
            respuesta = this.servicioJwt.crearToken(datos);
          } catch (error) {
            throw error;
          }
        }
      } else {
        respuesta = 'Código inválido.'
      }
    }
    return respuesta;
  }
}
