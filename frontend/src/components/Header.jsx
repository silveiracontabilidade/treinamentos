import React, { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logoImg from '../assets/images/logo.png';

const Header = ({ usuarioEmail, meusTreinamentos, perfil, onAdminLogout, onUserLogout }) => {
  const [menuAberto, setMenuAberto] = useState(null);

  const toggleMenu = (id) => {
    setMenuAberto(menuAberto === id ? null : id);
  };

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__branding">
          <img src={logoImg} alt="Silveira Contabilidade" className="branding__logo" />
          <div className="branding__text">
            <span className="branding__main">Silveira</span>
            <span className="branding__sub">Treinamentos</span>
          </div>
        </div>

        <nav className="header__nav">
          <ul>
            {perfil === 'Admin' && (
              <li
                style={{ position: 'relative' }}
                onMouseEnter={() => toggleMenu('cadastros')}
                onMouseLeave={() => toggleMenu(null)}
              >
                <span className="menu__title">Cadastros</span>
                {menuAberto === 'cadastros' && (
                  <ul className="submenu">
                    <li>
                      <NavLink to="/admin/usuarios">Usuarios</NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin">Treinamentos</NavLink>
                    </li>
                  </ul>
                )}
              </li>
            )}
            <li
              style={{ position: 'relative' }}
              onMouseEnter={() => toggleMenu('usuario')}
              onMouseLeave={() => toggleMenu(null)}
            >
              <span className="menu__title">
                <User size={20} />
              </span>
              {menuAberto === 'usuario' && (
                <ul className="submenu">
                  <li>{usuarioEmail || 'usuario@silveira.com.br'}</li>
                  <li>{perfil || 'Colaborador'}</li>
                  {perfil !== 'Admin' && <li>Meus treinamentos</li>}
                </ul>
              )}
            </li>
            {perfil === 'Admin' && (
              <li>
                <span className="menu__title" onClick={onAdminLogout} title="Sair do admin">
                  <LogOut size={18} />
                </span>
              </li>
            )}
            {perfil !== 'Admin' && (
              <li>
                <span className="menu__title" onClick={onUserLogout} title="Sair">
                  <LogOut size={18} />
                </span>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
