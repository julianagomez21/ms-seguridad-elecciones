import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where
} from '@loopback/repository';
import {
  del, get,
  getModelSchemaRef, HttpErrors, param, patch, post, put, requestBody,
  response
} from '@loopback/rest';
import {CredencialesLogin, CredencialesRecuperacion, Usuario} from '../models';
import {UsuarioRepository} from '../repositories';
import {JwtService, SeguridadUsuarioService} from '../services';

export class UsuarioController {
  constructor(
    @repository(UsuarioRepository)
    public usuarioRepository: UsuarioRepository,
    @service(SeguridadUsuarioService)
    private servicioSeguridad: SeguridadUsuarioService,
    @service(JwtService)
    private servicioJWT: JwtService
  ) { }

  @post('/usuarios')
  @response(200, {
    description: 'Usuario model instance',
    content: {'application/json': {schema: getModelSchemaRef(Usuario)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {
            title: 'NewUsuario',
            exclude: ['_id'],
          }),
        },
      },
    })
    usuario: Omit<Usuario, '_id'>,
  ): Promise<Usuario> {

    let claveGenerada = this.servicioSeguridad.crearClaveAleatoria();
    let claveCifrada = this.servicioSeguridad.cifrarCadena(claveGenerada);
    usuario.clave = claveCifrada;

    //notificar al usuario que se ha creado en el sistema (con clave generada)
    const usuarioCreado = await this.usuarioRepository.create(usuario);
    await this.servicioSeguridad.correoPrimerContrase├▒a(usuario.correo, claveGenerada);
    return usuarioCreado;
  }

  @get('/usuarios/count')
  @response(200, {
    description: 'Usuario model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Usuario) where?: Where<Usuario>,
  ): Promise<Count> {
    return this.usuarioRepository.count(where);
  }

  @get('/usuarios')
  @response(200, {
    description: 'Array of Usuario model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Usuario, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Usuario) filter?: Filter<Usuario>,
  ): Promise<Usuario[]> {
    return this.usuarioRepository.find(filter);
  }

  @patch('/usuarios')
  @response(200, {
    description: 'Usuario PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
    @param.where(Usuario) where?: Where<Usuario>,
  ): Promise<Count> {
    return this.usuarioRepository.updateAll(usuario, where);
  }

  @get('/usuarios/{id}')
  @response(200, {
    description: 'Usuario model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Usuario, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Usuario, {exclude: 'where'}) filter?: FilterExcludingWhere<Usuario>
  ): Promise<Usuario> {
    return this.usuarioRepository.findById(id, filter);
  }

  @patch('/usuarios/{id}')
  @response(204, {
    description: 'Usuario PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.updateById(id, usuario);
  }

  @put('/usuarios/{id}')
  @response(204, {
    description: 'Usuario PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.replaceById(id, usuario);
  }

  @del('/usuarios/{id}')
  @response(204, {
    description: 'Usuario DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.usuarioRepository.deleteById(id);
  }

  /**
   * Bloque de metodos personalizados para la seguridad del usuario.
   */

  @post('/login')
  @response(200, {
    description: 'Identificacion de usuarios',
    content: {'application/json': {schema: getModelSchemaRef(CredencialesLogin)}},
  })

  async identificar(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CredencialesLogin),
        },
      },
    })
    credenciales: CredencialesLogin
  ): Promise<string> {
    try {
      return await this.servicioSeguridad.identificarUsuario(credenciales);

    } catch (err) {
      throw new HttpErrors[400](`Se ha generado un error en la validacion de las credenciales para el usuario: ${credenciales.nombreUsuario}`);
    }
  }

  @get('/validate-token/{jwt}')
  @response(200, {
    description: 'Validar un token JWT',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Object),
      },
    },
  })
  async validateJWT(
    @param.path.string('jwt') jwt: string,
  ): Promise<string> {
    let valido = this.servicioJWT.validarToken(jwt);
    return valido;
  }

  @get('/validate-code/{code}')
  @response(200, {
    description: 'Validar c├│digo',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Object),
      },
    },
  })
  async validateCode(
    @param.path.string('code') codigo: string,
  ): Promise<string> {
    let valido = this.servicioSeguridad.validarCodigo(codigo);
    return valido;
  }
  @post('/recuperar-clave')
  @response(200, {
    description: 'Identificacion de usuarios',
    content: {'application/json': {schema: getModelSchemaRef(CredencialesRecuperacion)}},
  })

  async recuperarClave(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CredencialesRecuperacion),
        },
      },
    })
    credenciales: CredencialesRecuperacion
  ): Promise<boolean> {
    try {
      return await this.servicioSeguridad.recuperarClave(credenciales);
    } catch (err) {
      throw new HttpErrors[400](`Se ha generado un error en la recuperacion de la clave para el correo: ${credenciales.correo}`);
    }
  }

}
