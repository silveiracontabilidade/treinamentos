from django.contrib import admin
from .models import (
    Departamento,
    Treinamento,
    Modulo,
    Colaborador,
    TreinamentoMatricula,
    ModuloProgresso,
)

admin.site.register(Departamento)
admin.site.register(Treinamento)
admin.site.register(Modulo)
admin.site.register(Colaborador)
admin.site.register(TreinamentoMatricula)
admin.site.register(ModuloProgresso)
