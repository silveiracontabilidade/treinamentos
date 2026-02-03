from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DepartamentoViewSet,
    TreinamentoViewSet,
    ModuloViewSet,
    ColaboradorViewSet,
    TreinamentoMatriculaViewSet,
    ModuloProgressoViewSet,
    UsuarioViewSet,
    EmailLoginView,
    IniciarTreinamentoView,
    ConcluirModuloView,
    PublicCatalogoView,
    MeProgressoView,
)

router = DefaultRouter()
router.register(r"departamentos", DepartamentoViewSet)
router.register(r"treinamentos", TreinamentoViewSet)
router.register(r"modulos", ModuloViewSet)
router.register(r"colaboradores", ColaboradorViewSet)
router.register(r"matriculas", TreinamentoMatriculaViewSet)
router.register(r"progresso", ModuloProgressoViewSet)
router.register(r"usuarios", UsuarioViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("public/login-email/", EmailLoginView.as_view(), name="login_email"),
    path("public/iniciar-treinamento/", IniciarTreinamentoView.as_view(), name="iniciar_treinamento"),
    path("public/concluir-modulo/", ConcluirModuloView.as_view(), name="concluir_modulo"),
    path("public/catalogo/", PublicCatalogoView.as_view(), name="catalogo_publico"),
    path("public/me/progresso/", MeProgressoView.as_view(), name="me_progresso"),
]
