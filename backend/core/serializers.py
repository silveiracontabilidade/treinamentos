from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    Departamento,
    Treinamento,
    Modulo,
    Colaborador,
    TreinamentoMatricula,
    ModuloProgresso,
)


class ModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modulo
        fields = ["id", "titulo", "descricao", "video_iframe", "treinamento"]


class TreinamentoSerializer(serializers.ModelSerializer):
    modulos = ModuloSerializer(many=True, read_only=True)

    class Meta:
        model = Treinamento
        fields = [
            "id",
            "codigo",
            "nome",
            "responsavel",
            "ultima_atualizacao",
            "departamento",
            "modulos",
        ]
        extra_kwargs = {
            "codigo": {"required": False, "allow_blank": True},
        }


class DepartamentoSerializer(serializers.ModelSerializer):
    treinamentos = TreinamentoSerializer(many=True, read_only=True)

    class Meta:
        model = Departamento
        fields = ["id", "nome", "treinamentos"]


class ColaboradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Colaborador
        fields = ["id", "nome", "email", "administrador"]


class TreinamentoMatriculaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreinamentoMatricula
        fields = [
            "id",
            "colaborador",
            "treinamento",
            "status",
            "percentual_conclusao",
            "iniciado_em",
            "concluido_em",
        ]


class ModuloProgressoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloProgresso
        fields = ["id", "matricula", "modulo", "concluido", "concluido_em"]


class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nome = serializers.CharField(max_length=255, required=False, allow_blank=True)


class IniciarTreinamentoSerializer(serializers.Serializer):
    treinamento_id = serializers.IntegerField()


class ConcluirModuloSerializer(serializers.Serializer):
    modulo_id = serializers.IntegerField()
    concluido = serializers.BooleanField()


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
            "password",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password", None) or "Mudar123"
        user = self.Meta.model(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UsuarioTreinamentoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()
    iniciado_em = serializers.DateTimeField(allow_null=True)
    concluido_em = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField()
