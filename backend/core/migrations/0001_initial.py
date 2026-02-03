from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Departamento",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nome", models.CharField(max_length=255)),
            ],
            options={
                "db_table": "DEPARTAMENTOS",
            },
        ),
        migrations.CreateModel(
            name="Colaborador",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nome", models.CharField(max_length=255)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("administrador", models.BooleanField(default=False)),
            ],
            options={
                "db_table": "COLABORADORES",
            },
        ),
        migrations.CreateModel(
            name="Treinamento",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("codigo", models.CharField(max_length=50)),
                ("nome", models.CharField(max_length=255)),
                ("responsavel", models.CharField(max_length=255)),
                ("ultima_atualizacao", models.DateField(blank=True, null=True)),
                (
                    "departamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="treinamentos",
                        to="core.departamento",
                    ),
                ),
            ],
            options={
                "db_table": "TREINAMENTOS",
            },
        ),
        migrations.CreateModel(
            name="Modulo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("titulo", models.CharField(max_length=255)),
                ("descricao", models.TextField()),
                ("video_iframe", models.TextField(blank=True)),
                (
                    "treinamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="modulos",
                        to="core.treinamento",
                    ),
                ),
            ],
            options={
                "db_table": "MODULOS",
            },
        ),
        migrations.CreateModel(
            name="TreinamentoMatricula",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[("nao_iniciado", "Nao iniciado"), ("em_andamento", "Em andamento"), ("concluido", "Concluido")],
                        default="nao_iniciado",
                        max_length=20,
                    ),
                ),
                ("percentual_conclusao", models.PositiveIntegerField(default=0)),
                ("iniciado_em", models.DateTimeField(blank=True, null=True)),
                ("concluido_em", models.DateTimeField(blank=True, null=True)),
                (
                    "colaborador",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="matriculas",
                        to="core.colaborador",
                    ),
                ),
                (
                    "treinamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="matriculas",
                        to="core.treinamento",
                    ),
                ),
            ],
            options={
                "db_table": "TREINAMENTO_MATRICULAS",
                "unique_together": {("colaborador", "treinamento")},
            },
        ),
        migrations.CreateModel(
            name="ModuloProgresso",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("concluido", models.BooleanField(default=False)),
                ("concluido_em", models.DateTimeField(blank=True, null=True)),
                (
                    "matricula",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="progresso_modulos",
                        to="core.treinamentomatricula",
                    ),
                ),
                (
                    "modulo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="progresso",
                        to="core.modulo",
                    ),
                ),
            ],
            options={
                "db_table": "MODULO_PROGRESSO",
                "unique_together": {("matricula", "modulo")},
            },
        ),
    ]
